const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
// bwip-js is the only new dependency SFG-155 adds: the project had no
// barcode encoder at all, and pdfkit does not draw one. The `/node` entry
// point is the pure-JS server build (no node-canvas), and it hands back a PNG
// buffer that `doc.image()` embeds directly.
const bwipjs = require("bwip-js/node");
const dayjs = require("dayjs");

const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const OrderLabel = require("../models/OrderLabel");
const Store = require("../models/Store");
const GeneralSettings = require("../models/GeneralSettings");
const CodCollection = require("../models/CodCollection");
const Shipment = require("../models/shipping/Shipment");
const StoreCarrierProvider = require("../models/shipping/StoreCarrierProvider");
const CarrierProvider = require("../models/shipping/CarrierProvider");
const { formatMoney } = require("../utils/formatMoney");
const logger = require("../config/logger");

// SFG-155  Packing Label / Packing Manifest generation.
//
// Reuses pdfkit, already the project's PDF tool (InvoiceService,
// analyticsExportService, AuditService), so there is a single PDF stack.
//
// Two hard rules this service enforces, both from the ticket:
//   1. Nothing carrier-specific is hardcoded. The layout reads
//      CarrierProvider.labelTemplate (logo, colour, routing line, footer);
//      a provider without one  internal fleet included  gets the generic
//      layout.
//   2. Generating or printing a label never touches Order.status. The label
//      lifecycle lives in its own collection (OrderLabel).

const MAX_ORDERS_PER_BATCH = 100;

// Page geometry per supported format. `label_10x15` is 100x150mm expressed in
// PostScript points (1mm = 2.8346pt)  the thermal/label-printer sheet. The
// format is a parameter end to end precisely so a third one (A5, 4x6in...)
// is a line here rather than a rewrite.
const PAGE_FORMATS = {
  a4: { size: "A4", margin: 36 },
  label_10x15: { size: [283.46, 425.2], margin: 14 },
};

// Type scale per format: the label sheet is a third of A4's width, so it gets
// its own sizes rather than a shrunk copy of the A4 one.
// `twoColumn` is off on the label sheet: at 100mm wide, a name and a phone
// side by side each get ~45mm and both end up truncated, so they stack.
const STYLES = {
  a4: { base: 9, small: 8, title: 15, heading: 10, barcodeH: 44, gap: 9, rowH: 15, twoColumn: true },
  label_10x15: { base: 7, small: 6, title: 10, heading: 7.5, barcodeH: 28, gap: 5, rowH: 11, twoColumn: false },
};

const COLORS = {
  ink: "#111111",
  muted: "#555555",
  rule: "#999999",
  banner: "#B00020",
};

const httpError = (status, message, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

// The order the pages come out in is the order the caller sent, de-duplicated
// and first-occurrence-wins  i.e. the Store Owner's selection order. It is
// never MongoDB's natural order, so two prints of the same selection always
// produce the same document.
const normalizeOrderIds = (orderIds) => {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw httpError(400, "orderIds est requis et doit être un tableau non vide");
  }
  if (orderIds.length > MAX_ORDERS_PER_BATCH) {
    throw httpError(400, `Maximum ${MAX_ORDERS_PER_BATCH} commandes par impression`);
  }

  const seen = new Set();
  const ids = [];
  for (const raw of orderIds) {
    const value = String(raw || "").trim();
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw httpError(400, `Identifiant de commande invalide: ${value || "(vide)"}`);
    }
    if (seen.has(value)) continue;
    seen.add(value);
    ids.push(value);
  }
  return ids;
};

const resolveFormat = (requested, store) => {
  if (requested) {
    const value = String(requested).trim();
    if (!PAGE_FORMATS[value]) {
      throw httpError(400, `Format inconnu: ${value}. Formats supportés: ${Object.keys(PAGE_FORMATS).join(", ")}`);
    }
    return value;
  }
  return store?.labelSettings?.format || "a4";
};

const asKey = (value) => (value ? String(value) : "");

// A back-office document must print an incomplete order rather than refuse to
// print it: a missing phone is a blank line, never a 500.
const orNA = (value) => {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text.length > 0 ? text : "N/A";
};

const COD_TOKEN_RE = /(^|[^a-z])(cod|cash)([^a-z]|$)|remboursement|livraison/i;

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

// Every read is filtered on the storeId derived from the auth context, never
// on anything the caller sent: an order id belonging to another store simply
// does not come back, and reports as "not found" like a made-up id  the
// caller learns nothing about its existence.
const loadContext = async (storeId, orderIds) => {
  if (!storeId) {
    throw httpError(400, "storeId est requis");
  }
  const ids = normalizeOrderIds(orderIds);

  const orders = await Order.find({ _id: { $in: ids }, storeId }).lean();
  const ordersById = new Map(orders.map((order) => [asKey(order._id), order]));

  const missing = ids.filter((id) => !ordersById.has(id));
  if (missing.length > 0) {
    throw httpError(404, `Commande(s) introuvable(s): ${missing.join(", ")}`, { missing });
  }

  const [store, settings, shipments, codCollections, items] = await Promise.all([
    Store.findById(storeId).lean(),
    GeneralSettings.findOne({ storeId }).populate("currencyId").lean(),
    // Oldest first so the last write into the map is the most recent shipment
    //  an order re-shipped after a failed delivery prints the live parcel.
    Shipment.find({ orderId: { $in: ids }, storeId }).sort({ createdAt: 1 }).lean(),
    CodCollection.find({ orderId: { $in: ids }, storeId }).sort({ createdAt: 1 }).lean(),
    OrderItem.find({ orderId: { $in: ids } }).sort({ createdAt: 1 }).lean(),
  ]);

  const shipmentByOrder = new Map();
  shipments.forEach((shipment) => shipmentByOrder.set(asKey(shipment.orderId), shipment));

  const codByOrder = new Map();
  codCollections.forEach((cod) => codByOrder.set(asKey(cod.orderId), cod));

  const itemsByOrder = new Map();
  items.forEach((item) => {
    const key = asKey(item.orderId);
    if (!itemsByOrder.has(key)) itemsByOrder.set(key, []);
    itemsByOrder.get(key).push(item);
  });

  const carrierByStoreCarrierId = await loadCarriers(storeId, shipments);

  const views = ids.map((id) =>
    buildLabelView({
      order: ordersById.get(id),
      shipment: shipmentByOrder.get(id) || null,
      cod: codByOrder.get(id) || null,
      items: itemsByOrder.get(id) || [],
      carrierByStoreCarrierId,
      store,
      settings,
    })
  );

  return { storeId, ids, store, settings, views };
};

// Shipment.carrierProviderId points at the store's connection
// (StoreCarrierProvider), which in turn points at the platform-level
// CarrierProvider that owns the label template. Older rows written straight
// with a CarrierProvider id are resolved too rather than silently losing
// their branding.
const loadCarriers = async (storeId, shipments) => {
  const linkIds = [...new Set(shipments.map((s) => asKey(s.carrierProviderId)).filter(Boolean))];
  if (linkIds.length === 0) return new Map();

  const storeCarriers = await StoreCarrierProvider.find({ _id: { $in: linkIds }, storeId }).lean();
  const providerIds = storeCarriers.map((sc) => asKey(sc.carrierProviderId));
  const unresolved = linkIds.filter((id) => !storeCarriers.some((sc) => asKey(sc._id) === id));

  const providers = await CarrierProvider.find({
    _id: { $in: [...new Set([...providerIds, ...unresolved])] },
  }).lean();
  const providersById = new Map(providers.map((p) => [asKey(p._id), p]));

  const byLinkId = new Map();
  storeCarriers.forEach((sc) => {
    const provider = providersById.get(asKey(sc.carrierProviderId));
    if (provider) byLinkId.set(asKey(sc._id), provider);
  });
  unresolved.forEach((id) => {
    const provider = providersById.get(id);
    if (provider) byLinkId.set(id, provider);
  });

  return byLinkId;
};

// Everything the renderer needs for one order, resolved once so the drawing
// code never touches a model again.
const buildLabelView = ({ order, shipment, cod, items, carrierByStoreCarrierId, store, settings }) => {
  const carrier = shipment ? carrierByStoreCarrierId.get(asKey(shipment.carrierProviderId)) || null : null;
  const template = carrier?.labelTemplate || {};

  // A label is a draft while the order has no shipment: without a shipment
  // there is no carrier tracking number, and printing a barcode for a number
  // the carrier never issued is worse than printing none. Order.trackingId
  // (the legacy locally-generated "KB-&") is shown as an internal reference
  // only  never encoded into the barcode.
  const trackingNumber = shipment?.trackingNumber || null;
  const isDraft = !trackingNumber;

  const shippingInfo = order.user_info || order.billing_info || {};
  const lines = items.length > 0 ? items.map(normalizeItem) : (order.cart || []).map(normalizeCartLine);

  const isCod = resolveIsCod(order, cod);

  return {
    order,
    shipment,
    carrier,
    template: {
      logoUrl: template.logoUrl || carrier?.logoUrl || "",
      brandColor: template.brandColor || carrier?.brandColor || "",
      routingText: template.routingText || "",
      footerNote: template.footerNote || "",
    },
    carrierName: carrier?.name || (shipment ? "Transporteur" : "Non assigné"),
    serviceName: order.shippingMethod?.title || order.shippingOption || "",
    trackingNumber,
    internalReference: order.trackingId || "",
    isDraft,
    isRefunded: order.status === "Refunded" || order.paymentStatus === "refunded",
    reference: order.invoice ? `#${order.invoice}` : order.orderNumber || asKey(order._id),
    orderNumber: order.orderNumber || "",
    date: order.createdAt ? dayjs(order.createdAt) : dayjs(),
    recipient: {
      name: shippingInfo.name || "",
      phone: shippingInfo.phone || shippingInfo.contact || "",
      email: shippingInfo.email || "",
      address: shippingInfo.address || "",
      city: shippingInfo.city || "",
      state: shippingInfo.state || "",
      zipCode: shippingInfo.zipCode || "",
      country: shippingInfo.country || "",
    },
    sender: buildSender(store, settings),
    items: lines,
    itemCount: lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
    total: Number(order.total) || 0,
    isCod,
    codAmount: isCod ? Number(cod?.amountExpected ?? order.total) || 0 : 0,
    paymentMethod: order.paymentMethod || "",
    paymentStatus: order.paymentStatus || "",
    status: order.status || "",
  };
};

const normalizeItem = (item) => ({
  name: item.productName || item.sku || "Article",
  sku: item.sku || "",
  quantity: Number(item.quantity) || 0,
  total: Number(item.total) || 0,
});

// Orders placed before order_items existed only carry the embedded cart  the
// same fallback the order screen uses (see orderController.itemsFromCart).
const normalizeCartLine = (line) => {
  const quantity = Number(line.quantity) || 0;
  const unit = Number(line.price) || 0;
  return {
    name: line.title || line.name || line.productName || "Article",
    sku: line.sku || "",
    quantity,
    total: Number(line.itemTotal) || unit * quantity,
  };
};

// A CodCollection row is the authoritative answer (SFG-154 created it for
// exactly this parcel). Without one, an unpaid cash/COD payment method is
// still cash to collect on the doorstep; anything already paid is not.
const resolveIsCod = (order, cod) => {
  if (cod) return true;
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") return false;
  return COD_TOKEN_RE.test(order.paymentMethod || "");
};

const buildSender = (store, settings) => {
  const addressParts = [
    store?.address || settings?.addressLine1 || "",
    settings?.addressLine2 || "",
    [settings?.city, settings?.postcode].filter(Boolean).join(" "),
  ].filter((part) => String(part || "").trim().length > 0);

  return {
    name: store?.name || settings?.storeName || "",
    phone: store?.phone || "",
    email: store?.email || "",
    address: addressParts.join(", "),
    taxId: store?.taxId || "",
  };
};

// ---------------------------------------------------------------------------
// Barcodes
// ---------------------------------------------------------------------------

// Code 128 is what the reference bon de livraison prints and what every
// Tunisian courier's handheld scanner reads. Encoding failures (a tracking
// number with characters Code 128 cannot represent) degrade to "number
// printed as text", never to a failed print job.
const buildBarcodes = async (views) => {
  const cache = new Map();
  for (const view of views) {
    const text = view.trackingNumber;
    if (!text || cache.has(text)) continue;
    try {
      const png = await bwipjs.toBuffer({
        bcid: "code128",
        text: String(text),
        scale: 3,
        height: 10,
        includetext: false,
        backgroundcolor: "FFFFFF",
      });
      cache.set(text, png);
    } catch (error) {
      logger.warn(`[LabelGeneration] barcode generation failed for "${text}": ${error.message}`);
      cache.set(text, null);
    }
  }
  return cache;
};

// Only inline data: URIs are embedded. Fetching a remote logo would put an
// outbound HTTP call on the path of a PDF the browser is already waiting on,
// and one slow carrier CDN would hang every print in the store.
const decodeInlineLogo = (logoUrl) => {
  if (typeof logoUrl !== "string" || !logoUrl.startsWith("data:image/")) return null;
  const base64 = logoUrl.slice(logoUrl.indexOf(",") + 1);
  try {
    return Buffer.from(base64, "base64");
  } catch (error) {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

// Starts collecting the document's output. Call it BEFORE drawing, and
// `doc.end()` once the last page is drawn  same buffer-the-stream shape as
// analyticsExportService.buildPdfExport.
const collectPdf = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

// Clamps a string to `maxLines` at the current font, appending an ellipsis.
// Binary search on the cut point: a 4000-character address is measured a
// dozen times, not four thousand. Nothing drawn through this can overflow
// its box.
const fitText = (doc, value, width, maxLines) => {
  const text = String(value === null || value === undefined ? "" : value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  // currentLineHeight(true) includes the line gap, which is what
  // heightOfString measures with  comparing against the gap-less height
  // shortens every single string by a line.
  const maxHeight = doc.currentLineHeight(true) * maxLines + 0.5;
  if (doc.heightOfString(text, { width }) <= maxHeight) return text;

  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, mid).trimEnd()}&`;
    if (doc.heightOfString(candidate, { width }) <= maxHeight) low = mid;
    else high = mid - 1;
  }
  return `${text.slice(0, low).trimEnd()}&`;
};

const drawText = (doc, value, x, y, width, { size, font = "Helvetica", color = COLORS.ink, lines = 1, align = "left" } = {}) => {
  doc.font(font).fontSize(size).fillColor(color);
  const text = fitText(doc, value, width, lines);
  doc.text(text, x, y, { width, align, lineBreak: true });
  return doc.y;
};

const drawRule = (doc, x, y, width, color = COLORS.rule) => {
  doc.moveTo(x, y).lineTo(x + width, y).lineWidth(0.5).strokeColor(color).stroke();
};

const drawBox = (doc, x, y, width, height, color = COLORS.rule) => {
  doc.rect(x, y, width, height).lineWidth(0.5).strokeColor(color).stroke();
};

// ---------------------------------------------------------------------------
// Packing Label
// ---------------------------------------------------------------------------

const renderLabelPage = (doc, view, { style, barcodes, formatAmount, format }) => {
  const margin = PAGE_FORMATS[format].margin;
  const x = margin;
  const width = doc.page.width - margin * 2;
  const bottom = doc.page.height - margin;
  const barcode = view.trackingNumber ? barcodes.get(view.trackingNumber) : null;
  const brand = /^#[0-9a-fA-F]{3,8}$/.test(view.template.brandColor) ? view.template.brandColor : COLORS.ink;
  let y = margin;

  // --- Carrier header: logo/name on the left, date on the right ------------
  const logo = decodeInlineLogo(view.template.logoUrl);
  const headerHeight = style.heading * 2.4;
  if (logo) {
    try {
      doc.image(logo, x, y, { fit: [width * 0.4, headerHeight] });
    } catch (error) {
      drawText(doc, view.carrierName, x, y, width * 0.6, { size: style.heading, font: "Helvetica-Bold", color: brand });
    }
  } else {
    drawText(doc, view.carrierName, x, y, width * 0.6, { size: style.heading, font: "Helvetica-Bold", color: brand });
  }
  drawText(doc, `Date: ${view.date.format("DD/MM/YYYY")}`, x + width * 0.6, y, width * 0.4, {
    size: style.small,
    align: "right",
  });
  y += headerHeight;
  drawRule(doc, x, y, width, brand);
  y += style.gap;

  // --- Bon de livraison né + barcode (occurrence 1 of 2) -------------------
  const titleBoxHeight = style.barcodeH + style.gap * 2 + style.base;
  drawBox(doc, x, y, width, titleBoxHeight);
  const pad = style.gap;
  drawText(doc, "BON DE LIVRAISON Né", x + pad, y + pad, width * 0.45, { size: style.small, color: COLORS.muted });
  drawText(doc, view.trackingNumber || "NON ATTRIBU", x + pad, y + pad + style.small + 3, width * 0.45, {
    size: style.title,
    font: "Helvetica-Bold",
  });
  if (view.internalReference) {
    drawText(doc, `Réf. interne: ${view.internalReference}`, x + pad, y + pad + style.small + style.title + 6, width * 0.45, {
      size: style.small,
      color: COLORS.muted,
    });
  }
  if (barcode) {
    doc.image(barcode, x + width * 0.5, y + pad, { fit: [width * 0.5 - pad, style.barcodeH] });
  } else {
    drawText(doc, view.isDraft ? "Aucun code-barres (brouillon)" : "Code-barres indisponible", x + width * 0.5, y + pad + style.barcodeH / 2, width * 0.5 - pad, {
      size: style.small,
      color: COLORS.muted,
      align: "right",
    });
  }
  y += titleBoxHeight + style.gap;

  // --- Draft / refund banners ---------------------------------------------
  if (view.isDraft) {
    y = drawBanner(doc, x, y, width, style, "BROUILLON  colis non pris en charge par un transporteur");
  }
  if (view.isRefunded) {
    y = drawBanner(doc, x, y, width, style, "COMMANDE REMBOURSÉE  traiter en retour, ne pas encaisser");
  }

  // --- Sender --------------------------------------------------------------
  y = drawSectionTitle(doc, "EXPÉDITEUR", x, y, width, style);
  y = drawPair(
    doc,
    `Nom de l'expéditeur: ${orNA(view.sender.name)}`,
    `Téléphone: ${orNA(view.sender.phone)}`,
    x,
    y,
    width,
    style,
    "left"
  );
  y = drawText(doc, `Adresse: ${orNA(view.sender.address)}`, x, y, width, { size: style.base, lines: 2 });
  // Legally mandatory in Tunisia on a bon de livraison (circulaire né 2019-8
  // du 25/02/2019)  printed as soon as the store has configured one.
  if (view.sender.taxId) {
    y = drawText(doc, `Matricule Fiscal / CIN: ${view.sender.taxId}`, x, y, width, { size: style.base });
  }
  if (view.sender.email) {
    y = drawText(doc, `Email: ${view.sender.email}`, x, y, width, { size: style.small, color: COLORS.muted });
  }
  y += style.gap;

  // --- Routing band + barcode (occurrence 2 of 2) --------------------------
  if (barcode) {
    doc.image(barcode, x, y, { fit: [width, style.barcodeH] });
    y += style.barcodeH + 2;
  }
  // Carrier-specific, never hardcoded: First Delivery prints
  // "Centrale >> ---- Dispatch ---- >> Centrale", another carrier prints
  // something else, most print nothing.
  if (view.template.routingText) {
    y = drawText(doc, view.template.routingText, x, y, width, { size: style.small, align: "center", color: COLORS.muted });
  }
  y += style.gap;
  drawRule(doc, x, y, width);
  y += style.gap;

  // --- Recipient -----------------------------------------------------------
  y = drawSectionTitle(doc, "DESTINATAIRE", x, y, width, style);
  y = drawText(doc, `NOM: ${orNA(view.recipient.name)}`, x, y, width, { size: style.base, font: "Helvetica-Bold" });
  y = drawText(doc, `ADRESSE: ${orNA(view.recipient.address)}`, x, y, width, { size: style.base, lines: 2 });
  const locality = [view.recipient.city, view.recipient.state, view.recipient.zipCode, view.recipient.country]
    .filter((part) => String(part || "").trim().length > 0)
    .join(", ");
  y = drawText(doc, `VILLE: ${orNA(locality)}`, x, y, width, { size: style.base, lines: 2 });
  y = drawPair(
    doc,
    `Téléphone: ${orNA(view.recipient.phone)}`,
    `Commande: ${view.reference}`,
    x,
    y,
    width,
    style
  );
  y += style.gap;

  // --- Items ---------------------------------------------------------------
  y = drawItemsTable(doc, view, { x, y, width, bottom, style, formatAmount, format });

  // --- Totals --------------------------------------------------------------
  y += style.gap / 2;
  drawRule(doc, x, y, width);
  y += 3;
  y = drawText(doc, `Nombre d'articles: ${view.itemCount}`, x, y, width, { size: style.base });
  y = drawText(doc, `Montant total TTC: ${formatAmount(view.total, view.order)}`, x, y, width, {
    size: style.base,
    font: "Helvetica-Bold",
  });
  // Hidden entirely on a prepaid order rather than printed as 0  a driver
  // reading "0" on the doorstep is a dispute waiting to happen.
  if (view.isCod) {
    y = drawText(doc, `MONTANT  ENCAISSER: ${formatAmount(view.codAmount, view.order)}`, x, y, width, {
      size: style.heading,
      font: "Helvetica-Bold",
      color: COLORS.banner,
    });
  }
  y = drawText(
    doc,
    `Paiement: ${orNA(view.paymentMethod)}${view.serviceName ? `  Service: ${view.serviceName}` : ""}`,
    x,
    y,
    width,
    { size: style.small, color: COLORS.muted }
  );

  if (view.template.footerNote) {
    drawText(doc, view.template.footerNote, x, Math.min(y + style.gap, bottom - style.small * 2), width, {
      size: style.small,
      color: COLORS.muted,
      lines: 2,
    });
  }
};

const drawBanner = (doc, x, y, width, style, text) => {
  const height = style.base * 1.9;
  doc.rect(x, y, width, height).lineWidth(1).strokeColor(COLORS.banner).stroke();
  doc.font("Helvetica-Bold").fontSize(style.small).fillColor(COLORS.banner);
  doc.text(fitText(doc, text, width - 8, 1), x + 4, y + height / 2 - style.small * 0.7, { width: width - 8, align: "center" });
  return y + height + style.gap / 2;
};

// Two fields on one line on A4, one under the other on the label sheet.
// Returns the y to carry on from either way.
const drawPair = (doc, left, right, x, y, width, style, rightAlign = "right") => {
  if (!style.twoColumn) {
    const afterLeft = drawText(doc, left, x, y, width, { size: style.base });
    return drawText(doc, right, x, afterLeft, width, { size: style.base });
  }
  const columnWidth = width / 2 - style.gap;
  drawText(doc, left, x, y, columnWidth, { size: style.base });
  const end = drawText(doc, right, x + width / 2, y, columnWidth, { size: style.base, align: rightAlign });
  return end;
};

const drawSectionTitle = (doc, title, x, y, width, style) => {
  const end = drawText(doc, title, x, y, width, { size: style.small, font: "Helvetica-Bold", color: COLORS.muted });
  return end + 1;
};

// "Désignation-Contenu du colis | Quantité | Montant TTC". An order with more
// lines than the sheet can hold continues on a following page rather than
// spilling off the edge  the ticket's pagination case.
const drawItemsTable = (doc, view, { x, y, width, bottom, style, formatAmount }) => {
  const qtyWidth = width * 0.16;
  const amountWidth = width * 0.26;
  const nameWidth = width - qtyWidth - amountWidth;
  let cursor = y;

  const drawHeader = (top) => {
    doc.font("Helvetica-Bold").fontSize(style.small).fillColor(COLORS.ink);
    doc.text("Désignation-Contenu du colis", x, top, { width: nameWidth });
    doc.text("Quantité", x + nameWidth, top, { width: qtyWidth, align: "center" });
    doc.text("Montant TTC", x + nameWidth + qtyWidth, top, { width: amountWidth, align: "right" });
    const next = top + style.small * 1.6;
    drawRule(doc, x, next - 2, width);
    return next;
  };

  cursor = drawHeader(cursor);

  // Room kept for the totals block that follows the table (articles, total,
  // COD line, payment line) so it never collides with the page edge.
  const tableBottom = bottom - style.rowH * 5;

  if (view.items.length === 0) {
    return drawText(doc, "Aucun article", x, cursor, width, { size: style.base, color: COLORS.muted });
  }

  view.items.forEach((line, index) => {
    if (cursor + style.rowH > tableBottom) {
      doc.addPage();
      cursor = doc.page.margins.top;
      cursor = drawText(doc, `${view.reference}  suite (${index + 1}/${view.items.length})`, x, cursor, width, {
        size: style.small,
        font: "Helvetica-Bold",
        color: COLORS.muted,
      });
      cursor = drawHeader(cursor + 2);
    }
    doc.font("Helvetica").fontSize(style.base).fillColor(COLORS.ink);
    const label = line.sku ? `${line.name} (${line.sku})` : line.name;
    doc.text(fitText(doc, label, nameWidth - 4, 1), x, cursor, { width: nameWidth - 4 });
    doc.text(String(line.quantity), x + nameWidth, cursor, { width: qtyWidth, align: "center" });
    doc.text(formatAmount(line.total, view.order), x + nameWidth + qtyWidth, cursor, {
      width: amountWidth,
      align: "right",
    });
    cursor += style.rowH;
  });

  return cursor;
};

// ---------------------------------------------------------------------------
// Packing Manifest
// ---------------------------------------------------------------------------

const MANIFEST_COLUMNS = [
  { key: "order", label: "Commande", weight: 0.12 },
  { key: "tracking", label: "Tracking", weight: 0.2 },
  { key: "carrier", label: "Transporteur", weight: 0.16 },
  { key: "customer", label: "Client", weight: 0.18 },
  { key: "city", label: "Ville", weight: 0.13 },
  { key: "cod", label: "COD", weight: 0.11 },
  { key: "status", label: "Statut", weight: 0.1 },
];

const renderManifest = (doc, ctx, { formatAmount }) => {
  const margin = PAGE_FORMATS.a4.margin;
  const style = STYLES.a4;
  const x = margin;
  const width = doc.page.width - margin * 2;
  const bottom = doc.page.height - margin;

  const carriers = [...new Set(ctx.views.map((v) => v.carrierName))];
  const parcelCount = ctx.views.filter((v) => v.shipment).length;
  const codTotal = ctx.views.reduce((sum, v) => sum + (v.isCod ? v.codAmount : 0), 0);

  let y = margin;
  y = drawText(doc, "PACKING MANIFEST", x, y, width, { size: 16, font: "Helvetica-Bold" });
  y = drawText(doc, ctx.store?.name || ctx.settings?.storeName || "", x, y, width, { size: style.heading });
  y = drawText(doc, `Imprimé le ${dayjs().format("DD/MM/YYYY HH:mm")}`, x, y, width, {
    size: style.small,
    color: COLORS.muted,
  });
  // A selection spanning several carriers must never show one carrier's name
  // in the header  the per-row column is then the only truth.
  y = drawText(
    doc,
    `Transporteur: ${carriers.length === 1 ? carriers[0] : `Plusieurs transporteurs (${carriers.length})  voir colonne Transporteur`}`,
    x,
    y,
    width,
    { size: style.base }
  );
  y = drawText(
    doc,
    `Commandes: ${ctx.views.length}    Colis: ${parcelCount}    Total COD: ${formatAmount(codTotal, ctx.views[0]?.order)}`,
    x,
    y,
    width,
    { size: style.base, font: "Helvetica-Bold" }
  );
  y += style.gap;

  const columns = MANIFEST_COLUMNS.map((col) => ({ ...col, width: width * col.weight }));

  const drawHeader = (top) => {
    doc.font("Helvetica-Bold").fontSize(style.small).fillColor(COLORS.ink);
    let cursorX = x;
    columns.forEach((col) => {
      doc.text(col.label, cursorX, top, { width: col.width - 4 });
      cursorX += col.width;
    });
    const next = top + style.small * 1.8;
    drawRule(doc, x, next - 3, width);
    return next;
  };

  y = drawHeader(y);

  ctx.views.forEach((view) => {
    if (y + style.rowH > bottom - style.rowH) {
      doc.addPage();
      y = drawHeader(margin);
    }
    const cells = {
      order: view.reference,
      tracking: view.trackingNumber || "",
      carrier: view.carrierName,
      customer: view.recipient.name || "N/A",
      city: view.recipient.city || "N/A",
      cod: view.isCod ? formatAmount(view.codAmount, view.order) : "",
      status: view.status,
    };
    doc.font("Helvetica").fontSize(style.small).fillColor(COLORS.ink);
    let cursorX = x;
    columns.forEach((col) => {
      doc.text(fitText(doc, cells[col.key], col.width - 4, 1), cursorX, y, { width: col.width - 4 });
      cursorX += col.width;
    });
    y += style.rowH;
  });

  drawRule(doc, x, y, width);
  y += 4;
  drawText(
    doc,
    `Total  encaisser (COD): ${formatAmount(codTotal, ctx.views[0]?.order)}  ${parcelCount} colis sur ${ctx.views.length} commandes`,
    x,
    y,
    width,
    { size: style.base, font: "Helvetica-Bold" }
  );

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    // The footer sits in the bottom margin, which is exactly where pdfkit
    // auto-breaks to a new page  zeroing the margin for the write is the
    // documented way to place text there without spawning a blank page.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(style.small).fillColor(COLORS.muted);
    doc.text(`Page ${i - range.start + 1} / ${range.count}`, x, doc.page.height - margin + 6, {
      width,
      align: "right",
    });
    doc.page.margins.bottom = bottomMargin;
  }
};

// ---------------------------------------------------------------------------
// Label lifecycle (pending  label_generated  printed)
// ---------------------------------------------------------------------------

// Writes only to order_labels. Order.status is never touched here: printing a
// label is not shipping a parcel.
const recordGeneration = async (ctx, format, userId) => {
  const now = new Date();
  const operations = [];

  ctx.views.forEach((view) => {
    const filter = { storeId: ctx.storeId, orderId: view.order._id };
    const snapshot = {
      shipmentId: view.shipment?._id || null,
      carrierProviderId: view.carrier?._id || null,
      trackingNumber: view.trackingNumber,
      isDraft: view.isDraft,
      format,
      generatedAt: now,
      generatedBy: userId || null,
    };

    operations.push({
      updateOne: {
        filter,
        update: { $set: snapshot, $setOnInsert: { status: "label_generated" } },
        upsert: true,
      },
    });
    // Second pass promotes an existing row out of "pending" while leaving a
    // row already marked "printed" alone  a reprint does not un-print.
    operations.push({
      updateOne: {
        filter: { ...filter, status: "pending" },
        update: { $set: { status: "label_generated" } },
      },
    });
  });

  await OrderLabel.bulkWrite(operations, { ordered: true });
};

const generatePackingLabels = async ({ storeId, orderIds, format, userId }) => {
  const ctx = await loadContext(storeId, orderIds);
  const resolvedFormat = resolveFormat(format, ctx.store);
  const style = STYLES[resolvedFormat];
  const barcodes = await buildBarcodes(ctx.views);
  const formatAmount = buildAmountFormatter(ctx.settings);

  const doc = new PDFDocument({ ...PAGE_FORMATS[resolvedFormat], autoFirstPage: false });
  const pdfPromise = collectPdf(doc);

  // One page per order, in the caller's selection order.
  ctx.views.forEach((view) => {
    doc.addPage();
    renderLabelPage(doc, view, { style, barcodes, formatAmount, format: resolvedFormat });
  });

  doc.end();
  const buffer = await pdfPromise;
  await recordGeneration(ctx, resolvedFormat, userId);

  return {
    buffer,
    format: resolvedFormat,
    orderCount: ctx.views.length,
    draftCount: ctx.views.filter((v) => v.isDraft).length,
    fileName: buildFileName("packing-labels", ctx),
  };
};

const generatePackingManifest = async ({ storeId, orderIds, userId }) => {
  const ctx = await loadContext(storeId, orderIds);
  const formatAmount = buildAmountFormatter(ctx.settings);

  const doc = new PDFDocument({ ...PAGE_FORMATS.a4, bufferPages: true });
  const pdfPromise = collectPdf(doc);
  renderManifest(doc, ctx, { formatAmount });
  doc.end();
  const buffer = await pdfPromise;

  // The manifest is the carrier hand-over sheet, so it counts as the label
  // having been produced too.
  await recordGeneration(ctx, resolveFormat(null, ctx.store), userId);

  return {
    buffer,
    orderCount: ctx.views.length,
    parcelCount: ctx.views.filter((v) => v.shipment).length,
    codTotal: ctx.views.reduce((sum, v) => sum + (v.isCod ? v.codAmount : 0), 0),
    fileName: buildFileName("packing-manifest", ctx),
  };
};

// The UI calls this once the browser's print dialog has been handed the PDF.
// A label can only be marked printed after it has been generated  the state
// machine has no shortcut from "pending" to "printed".
const markLabelsPrinted = async ({ storeId, orderIds, userId }) => {
  if (!storeId) throw httpError(400, "storeId est requis");
  const ids = normalizeOrderIds(orderIds);

  const orders = await Order.find({ _id: { $in: ids }, storeId }).select("_id").lean();
  const known = new Set(orders.map((order) => asKey(order._id)));
  const missing = ids.filter((id) => !known.has(id));
  if (missing.length > 0) {
    throw httpError(404, `Commande(s) introuvable(s): ${missing.join(", ")}`, { missing });
  }

  const labels = await OrderLabel.find({ storeId, orderId: { $in: ids } }).lean();
  const generated = new Set(
    labels.filter((label) => label.status !== "pending").map((label) => asKey(label.orderId))
  );
  const notGenerated = ids.filter((id) => !generated.has(id));
  if (notGenerated.length > 0) {
    throw httpError(409, `Label non généré pour: ${notGenerated.join(", ")}`, { notGenerated });
  }

  const now = new Date();
  await OrderLabel.bulkWrite(
    ids.map((id) => ({
      updateOne: {
        filter: { storeId, orderId: id },
        update: {
          $set: { status: "printed", printedAt: now, printedBy: userId || null },
          $inc: { printCount: 1 },
        },
      },
    }))
  );

  return OrderLabel.find({ storeId, orderId: { $in: ids } }).lean();
};

const getLabelStatuses = async ({ storeId, orderIds }) => {
  if (!storeId) throw httpError(400, "storeId est requis");
  const ids = normalizeOrderIds(orderIds);
  const labels = await OrderLabel.find({ storeId, orderId: { $in: ids } }).lean();
  const byOrder = new Map(labels.map((label) => [asKey(label.orderId), label]));

  return ids.map((id) => {
    const label = byOrder.get(id);
    return {
      orderId: id,
      status: label?.status || "pending",
      trackingNumber: label?.trackingNumber || null,
      isDraft: label?.isDraft ?? null,
      format: label?.format || null,
      generatedAt: label?.generatedAt || null,
      printedAt: label?.printedAt || null,
      printCount: label?.printCount || 0,
    };
  });
};

const buildAmountFormatter = (settings) => {
  const currency = settings?.currencyId;
  if (currency?.isoCode) {
    return (value) => formatMoney(Number(value) || 0, currency);
  }
  // No configured currency: fall back to the label the order was placed with
  // (Order.currency snapshots the store's currency name/symbol at checkout).
  return (value, order) => `${(Number(value) || 0).toFixed(2)} ${order?.currency || ""}`.trim();
};

const buildFileName = (prefix, ctx) => {
  const stamp = dayjs().format("YYYYMMDD-HHmm");
  const suffix = ctx.views.length === 1 ? ctx.views[0].reference.replace(/[^\w-]/g, "") : `${ctx.views.length}-commandes`;
  return `${prefix}-${suffix}-${stamp}.pdf`;
};

module.exports = {
  generatePackingLabels,
  generatePackingManifest,
  markLabelsPrinted,
  getLabelStatuses,
  // exported for tests
  loadContext,
  normalizeOrderIds,
  resolveFormat,
  resolveIsCod,
  fitText,
  PAGE_FORMATS,
  MAX_ORDERS_PER_BATCH,
};
