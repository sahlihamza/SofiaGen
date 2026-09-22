const AuditService = require("../service/AuditService");
const LabelGenerationService = require("../service/LabelGenerationService");
const logger = require("../config/logger");

// SFG-155  Orders > Print Labels.
//
// Kept out of orderController.js, which is already ~1000 lines of order CRUD,
// and mounted on the same /api/orders router so the whole feature sits behind
// the router's existing isAuth + requireStoreAccess + Orders permission
// chain (see orderRoutes.js).

// SO-08's rule, restated for this module: the store a label is printed for is
// the store the caller is authenticated into. req.body.storeId /
// req.params.storeId are never read  changing an order id in the request
// therefore cannot reach another store's order, because the lookup itself is
// filtered on this value.
const resolveStoreId = (req) => req.authContext?.storeId || req.currentStoreId;

const sendPdf = (res, buffer, fileName, { download = false } = {}) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", buffer.length);
  res.setHeader(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${fileName}"`
  );
  // A delivery note carries the customer's name, address and phone: no shared
  // cache may keep a copy.
  res.setHeader("Cache-Control", "private, no-store");
  return res.send(buffer);
};

const handleError = (res, error, context) => {
  const status = error.status || 500;
  if (status >= 500) {
    logger.error(`[orderLabelController] ${context}: ${error.message}`);
  }
  return res.status(status).json({
    success: false,
    message: status >= 500 ? "échec de la génération du document" : error.message,
  });
};

const audit = async (req, { action, summary, count, extra = {} }) => {
  try {
    await AuditService.logAction({
      actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      actorId: req.user?._id || null,
      storeId: resolveStoreId(req),
      module: "Orders",
      action,
      summary,
      entityType: "Order",
      status: "success",
      severity: "low",
      newValue: { count, ...extra },
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  } catch (error) {
    // An audit write must never cost the user their labels.
    logger.warn(`[orderLabelController] audit failed for ${action}: ${error.message}`);
  }
};

// POST /api/orders/labels  { orderIds: [...], format?: "a4" | "label_10x15" }
// One PDF, one page per selected order, in the order the ids were sent.
const printPackingLabels = async (req, res) => {
  try {
    const { orderIds, format, download } = req.body || {};
    const result = await LabelGenerationService.generatePackingLabels({
      storeId: resolveStoreId(req),
      orderIds,
      format,
      userId: req.user?._id,
    });

    await audit(req, {
      action: "orders.print_label",
      summary: `Packing labels générés pour ${result.orderCount} commande(s)`,
      count: result.orderCount,
      extra: { format: result.format, drafts: result.draftCount, orderIds },
    });

    return sendPdf(res, result.buffer, result.fileName, { download: Boolean(download) });
  } catch (error) {
    return handleError(res, error, "printPackingLabels");
  }
};

// POST /api/orders/labels/manifest  { orderIds: [...] }
// The carrier hand-over sheet: one A4 table for the whole selection.
const printPackingManifest = async (req, res) => {
  try {
    const { orderIds, download } = req.body || {};
    const result = await LabelGenerationService.generatePackingManifest({
      storeId: resolveStoreId(req),
      orderIds,
      userId: req.user?._id,
    });

    await audit(req, {
      action: "orders.print_manifest",
      summary: `Packing manifest généré pour ${result.orderCount} commande(s)`,
      count: result.orderCount,
      extra: { parcels: result.parcelCount, codTotal: result.codTotal, orderIds },
    });

    return sendPdf(res, result.buffer, result.fileName, { download: Boolean(download) });
  } catch (error) {
    return handleError(res, error, "printPackingManifest");
  }
};

// GET /api/orders/:id/label?format=&
// The single-order action in the row's Actions menu. Same code path as the
// bulk one with a one-element selection, so the two can never drift apart.
const printOrderLabel = async (req, res) => {
  try {
    const result = await LabelGenerationService.generatePackingLabels({
      storeId: resolveStoreId(req),
      orderIds: [req.params.id],
      format: req.query.format,
      userId: req.user?._id,
    });

    await audit(req, {
      action: "orders.print_label",
      summary: `Packing label généré pour la commande ${req.params.id}`,
      count: 1,
      extra: { format: result.format, drafts: result.draftCount, orderIds: [req.params.id] },
    });

    return sendPdf(res, result.buffer, result.fileName, { download: req.query.download === "1" });
  } catch (error) {
    return handleError(res, error, "printOrderLabel");
  }
};

// POST /api/orders/labels/printed  { orderIds: [...] }
// Closes the label lifecycle once the document has actually gone to a
// printer. Deliberately does not touch Order.status  marking an order
// "Shipped" stays a separate decision made in the Orders screen.
const markLabelsPrinted = async (req, res) => {
  try {
    const { orderIds } = req.body || {};
    const labels = await LabelGenerationService.markLabelsPrinted({
      storeId: resolveStoreId(req),
      orderIds,
      userId: req.user?._id,
    });

    await audit(req, {
      action: "orders.print_label_confirmed",
      summary: `${labels.length} label(s) marqué(s) imprimé(s)`,
      count: labels.length,
      extra: { orderIds },
    });

    return res.json({ success: true, data: labels });
  } catch (error) {
    return handleError(res, error, "markLabelsPrinted");
  }
};

// GET /api/orders/labels/status?orderIds=id1,id2
const getLabelStatuses = async (req, res) => {
  try {
    const raw = req.query.orderIds;
    const orderIds = Array.isArray(raw) ? raw : String(raw || "").split(",").filter(Boolean);
    const data = await LabelGenerationService.getLabelStatuses({
      storeId: resolveStoreId(req),
      orderIds,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "getLabelStatuses");
  }
};

module.exports = {
  printPackingLabels,
  printPackingManifest,
  printOrderLabel,
  markLabelsPrinted,
  getLabelStatuses,
};
