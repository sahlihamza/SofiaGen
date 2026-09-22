const mongoose = require("mongoose");

const LabelGenerationService = require("../../../src/service/LabelGenerationService");
const Store = require("../../../src/models/Store");
const Order = require("../../../src/models/Order");
const OrderItem = require("../../../src/models/OrderItem");
const OrderLabel = require("../../../src/models/OrderLabel");
const CodCollection = require("../../../src/models/CodCollection");
const Shipment = require("../../../src/models/shipping/Shipment");
const CarrierProvider = require("../../../src/models/shipping/CarrierProvider");
const StoreCarrierProvider = require("../../../src/models/shipping/StoreCarrierProvider");
const { readPages, pageCount, fullText } = require("../../unit/helpers/pdfText");

// SFG-155 — Packing Label / Packing Manifest.
//
// The whole test matrix from the ticket: single order, bulk, manifest totals,
// multi-store isolation, the label lifecycle, and one case per listed edge
// case (missing phone/address, no shipment, no carrier, non-COD, refunded,
// mixed carriers, many lines, very long address).

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sofiagen_test";

let storeA;
let storeB;
let carrier;
let carrierLink;
let plainCarrier;
let plainLink;

const makeOrder = async (overrides = {}) =>
  Order.create({
    storeId: storeA._id,
    user_info: {
      name: "Client A",
      phone: "+216 20 111 222",
      address: "Avenue Habib Bourguiba",
      city: "Tunis",
      state: "Tunis",
      zipCode: "1001",
      country: "TN",
    },
    cart: [],
    subTotal: 100,
    total: 120,
    currency: "DT",
    paymentMethod: "Cash on delivery",
    status: "Processing",
    ...overrides,
  });

const shipOrder = async (order, trackingNumber, link = carrierLink) =>
  Shipment.create({
    orderId: order._id,
    storeId: order.storeId,
    carrierProviderId: link._id,
    status: "label_created",
    trackingNumber,
  });

const ids = (...orders) => orders.map((order) => order._id.toString());

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Promise.all([
    Order.deleteMany({ storeId: { $exists: true } }),
    OrderItem.deleteMany({}),
    OrderLabel.deleteMany({ storeId: { $exists: true } }),
    Shipment.deleteMany({ storeId: { $exists: true } }),
    CodCollection.deleteMany({ storeId: { $exists: true } }),
    StoreCarrierProvider.deleteMany({ storeId: { $exists: true } }),
    CarrierProvider.deleteMany({}),
    Store.deleteMany({ name: /^SFG155/ }),
  ]);

  storeA = await Store.create({
    name: "SFG155 Boutique A",
    status: "active",
    address: "12 Rue de Marseille, Tunis",
    phone: "+216 71 000 000",
    email: "contact@boutique.tn",
    taxId: "1234567/A/M/000",
  });
  storeB = await Store.create({ name: "SFG155 Boutique B", status: "active" });

  carrier = await CarrierProvider.create({
    name: "First Delivery",
    adapterKey: "localcourier",
    endpoint: "https://api.first.tn",
    brandColor: "#E63946",
    labelTemplate: {
      routingText: "Centrale >> ---- Dispatch ---- >> Centrale",
      footerNote: "Vérifier le colis avant signature.",
    },
  });
  carrierLink = await StoreCarrierProvider.create({
    storeId: storeA._id,
    carrierProviderId: carrier._id,
    isActive: true,
  });

  // A second carrier with no labelTemplate at all — the generic fallback.
  plainCarrier = await CarrierProvider.create({
    name: "Flotte Interne",
    adapterKey: "internal_fleet",
    endpoint: "internal",
    isInternalFleet: true,
  });
  plainLink = await StoreCarrierProvider.create({
    storeId: storeA._id,
    carrierProviderId: plainCarrier._id,
    isActive: true,
  });
});

describe("Packing Label — single order", () => {
  it("prints the reference layout: carrier header, bon de livraison n°, sender with matricule fiscal, recipient, items", async () => {
    const order = await makeOrder();
    await OrderItem.create({
      orderId: order._id,
      productId: new mongoose.Types.ObjectId(),
      productName: "T-shirt coton",
      sku: "TS-01",
      quantity: 2,
      unitPrice: 40,
      total: 80,
    });
    await shipOrder(order, "752256410612");

    const result = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
    });

    expect(result.orderCount).toBe(1);
    expect(pageCount(result.buffer)).toBe(1);

    const text = fullText(result.buffer);
    expect(text).toContain("First Delivery");
    expect(text).toContain("BON DE LIVRAISON N°");
    expect(text).toContain("752256410612");
    expect(text).toContain("EXPÉDITEUR");
    expect(text).toContain("SFG155 Boutique A");
    expect(text).toContain("Matricule Fiscal / CIN: 1234567/A/M/000");
    expect(text).toContain("DESTINATAIRE");
    expect(text).toContain("Client A");
    expect(text).toContain("Avenue Habib Bourguiba");
    expect(text).toContain("Désignation-Contenu du colis");
    expect(text).toContain("T-shirt coton (TS-01)");
    expect(text).toContain("Centrale >> ---- Dispatch ---- >> Centrale");
  });

  it("draws the barcode twice — once in the header, once in the routing band", async () => {
    const order = await makeOrder();
    await shipOrder(order, "752256410612");

    const result = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
    });

    expect(readPages(result.buffer)[0].images).toBe(2);
  });

  it("records the label as generated without touching the order status", async () => {
    const order = await makeOrder({ status: "Processing" });
    await shipOrder(order, "752256410612");
    const userId = new mongoose.Types.ObjectId();

    await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
      userId,
    });

    const label = await OrderLabel.findOne({ storeId: storeA._id, orderId: order._id }).lean();
    expect(label.status).toBe("label_generated");
    expect(label.trackingNumber).toBe("752256410612");
    expect(label.isDraft).toBe(false);
    expect(String(label.generatedBy)).toBe(String(userId));

    const reloaded = await Order.findOne({ _id: order._id, storeId: storeA._id }).lean();
    expect(reloaded.status).toBe("Processing");
  });

  it("honours the store's default format and the per-request override", async () => {
    const order = await makeOrder();
    await Store.updateOne({ _id: storeA._id }, { $set: { "labelSettings.format": "label_10x15" } });

    const fromSettings = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
    });
    expect(fromSettings.format).toBe("label_10x15");

    const overridden = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
      format: "a4",
    });
    expect(overridden.format).toBe("a4");

    await expect(
      LabelGenerationService.generatePackingLabels({
        storeId: storeA._id,
        orderIds: ids(order),
        format: "a3",
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("Packing Label — bulk", () => {
  it("produces one page per order, in the selection order", async () => {
    const first = await makeOrder({ user_info: { name: "Client Un" } });
    const second = await makeOrder({ user_info: { name: "Client Deux" } });
    const third = await makeOrder({ user_info: { name: "Client Trois" } });

    const result = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(third, first, second),
    });

    expect(result.orderCount).toBe(3);
    expect(pageCount(result.buffer)).toBe(3);

    const pages = readPages(result.buffer);
    expect(pages[0].text).toContain("Client Trois");
    expect(pages[1].text).toContain("Client Un");
    expect(pages[2].text).toContain("Client Deux");
  });

  it("de-duplicates a repeated selection instead of printing the same label twice", async () => {
    const order = await makeOrder();
    const result = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: [...ids(order), ...ids(order)],
    });
    expect(result.orderCount).toBe(1);
    expect(pageCount(result.buffer)).toBe(1);
  });

  it("gives each order its own carrier template when the selection mixes carriers", async () => {
    const withTemplate = await makeOrder({ user_info: { name: "Client First" } });
    const withoutTemplate = await makeOrder({ user_info: { name: "Client Flotte" } });
    await shipOrder(withTemplate, "111111111111", carrierLink);
    await shipOrder(withoutTemplate, "222222222222", plainLink);

    const pages = readPages(
      (
        await LabelGenerationService.generatePackingLabels({
          storeId: storeA._id,
          orderIds: ids(withTemplate, withoutTemplate),
        })
      ).buffer
    );

    expect(pages[0].text).toContain("First Delivery");
    expect(pages[0].text).toContain("Centrale >> ---- Dispatch ---- >> Centrale");
    // Generic template: the second carrier configured no routing line.
    expect(pages[1].text).toContain("Flotte Interne");
    expect(pages[1].text).not.toContain("Dispatch");
  });

  it("rejects an empty, malformed or oversized selection", async () => {
    await expect(
      LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: [] })
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: ["not-an-id"] })
    ).rejects.toMatchObject({ status: 400 });

    const tooMany = Array.from({ length: LabelGenerationService.MAX_ORDERS_PER_BATCH + 1 }, () =>
      new mongoose.Types.ObjectId().toString()
    );
    await expect(
      LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: tooMany })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns 404 for an order id that does not exist", async () => {
    const ghost = new mongoose.Types.ObjectId().toString();
    await expect(
      LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: [ghost] })
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("Packing Manifest", () => {
  it("lists every selected order with exact COD total and parcel count", async () => {
    const codOrder = await makeOrder({ user_info: { name: "Client COD", city: "Tunis" }, total: 120 });
    const prepaid = await makeOrder({
      user_info: { name: "Client Payé", city: "Sousse" },
      paymentMethod: "credit card",
      paymentStatus: "paid",
      total: 80,
    });
    const noShipment = await makeOrder({ user_info: { name: "Client Sans Colis", city: "Sfax" }, total: 60 });

    const shipment = await shipOrder(codOrder, "752256410612");
    await shipOrder(prepaid, "999888777666");
    await CodCollection.create({
      shipmentId: shipment._id,
      driverId: new mongoose.Types.ObjectId(),
      storeId: storeA._id,
      orderId: codOrder._id,
      amountExpected: 120,
    });

    const result = await LabelGenerationService.generatePackingManifest({
      storeId: storeA._id,
      orderIds: ids(codOrder, prepaid, noShipment),
    });

    expect(result.orderCount).toBe(3);
    // Parcels = orders actually handed to a carrier, so the order with no
    // shipment is counted as a line but not as a parcel.
    expect(result.parcelCount).toBe(2);
    expect(result.codTotal).toBe(180); // 120 (CodCollection) + 60 (unpaid COD order)

    const text = fullText(result.buffer);
    expect(text).toContain("PACKING MANIFEST");
    expect(text).toContain("Client COD");
    expect(text).toContain("Client Payé");
    expect(text).toContain("Client Sans Colis");
    expect(text).toContain("752256410612");
    expect(text).toContain("Commandes: 3");
    expect(text).toContain("Colis: 2");
  });

  it("never claims a single carrier when the selection mixes several", async () => {
    const first = await makeOrder();
    const second = await makeOrder();
    await shipOrder(first, "111111111111", carrierLink);
    await shipOrder(second, "222222222222", plainLink);

    const result = await LabelGenerationService.generatePackingManifest({
      storeId: storeA._id,
      orderIds: ids(first, second),
    });

    const text = fullText(result.buffer);
    expect(text).toContain("Plusieurs transporteurs (2)");
    expect(text).toContain("First Delivery");
    expect(text).toContain("Flotte Interne");
  });

  it("shows one carrier in the header when the whole selection shares it", async () => {
    const first = await makeOrder();
    const second = await makeOrder();
    await shipOrder(first, "111111111111");
    await shipOrder(second, "222222222222");

    const result = await LabelGenerationService.generatePackingManifest({
      storeId: storeA._id,
      orderIds: ids(first, second),
    });

    expect(fullText(result.buffer)).toContain("Transporteur: First Delivery");
  });
});

describe("Multi-store isolation", () => {
  it("refuses to print an order belonging to another store, with no hint it exists", async () => {
    const foreign = await Order.create({
      storeId: storeB._id,
      user_info: { name: "Client Store B" },
      cart: [],
      subTotal: 10,
      total: 10,
      paymentMethod: "cash",
    });
    const ghost = new mongoose.Types.ObjectId().toString();

    const foreignError = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: [foreign._id.toString()],
    }).catch((error) => error);
    const ghostError = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: [ghost],
    }).catch((error) => error);

    expect(foreignError.status).toBe(404);
    // A foreign order and a made-up one must be indistinguishable, otherwise
    // the endpoint becomes an order-existence oracle.
    expect(foreignError.message.replace(foreign._id.toString(), "ID")).toBe(
      ghostError.message.replace(ghost, "ID")
    );
  });

  it("drops a foreign order from a mixed selection instead of printing it", async () => {
    const mine = await makeOrder();
    const foreign = await Order.create({
      storeId: storeB._id,
      user_info: { name: "Client Store B" },
      cart: [],
      subTotal: 10,
      total: 10,
      paymentMethod: "cash",
    });

    await expect(
      LabelGenerationService.generatePackingLabels({
        storeId: storeA._id,
        orderIds: ids(mine, foreign),
      })
    ).rejects.toMatchObject({ status: 404 });

    // Nothing was generated at all: a partial print would leak the foreign
    // order's absence and silently drop a label the operator expected.
    const labels = await OrderLabel.find({ storeId: storeA._id }).lean();
    expect(labels).toHaveLength(0);
  });

  it("refuses to mark another store's order as printed", async () => {
    const foreign = await Order.create({
      storeId: storeB._id,
      user_info: { name: "Client Store B" },
      cart: [],
      subTotal: 10,
      total: 10,
      paymentMethod: "cash",
    });

    await expect(
      LabelGenerationService.markLabelsPrinted({
        storeId: storeA._id,
        orderIds: [foreign._id.toString()],
      })
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("Label lifecycle", () => {
  it("walks pending → label_generated → printed and leaves Order.status alone", async () => {
    const order = await makeOrder({ status: "Processing" });
    await shipOrder(order, "752256410612");

    const before = await LabelGenerationService.getLabelStatuses({
      storeId: storeA._id,
      orderIds: ids(order),
    });
    expect(before[0].status).toBe("pending");

    await LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: ids(order) });
    const generated = await LabelGenerationService.getLabelStatuses({
      storeId: storeA._id,
      orderIds: ids(order),
    });
    expect(generated[0].status).toBe("label_generated");

    const printed = await LabelGenerationService.markLabelsPrinted({
      storeId: storeA._id,
      orderIds: ids(order),
    });
    expect(printed[0].status).toBe("printed");
    expect(printed[0].printCount).toBe(1);

    const reloaded = await Order.findOne({ _id: order._id, storeId: storeA._id }).lean();
    expect(reloaded.status).toBe("Processing");
  });

  it("keeps a printed label printed when it is regenerated", async () => {
    const order = await makeOrder();
    await LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: ids(order) });
    await LabelGenerationService.markLabelsPrinted({ storeId: storeA._id, orderIds: ids(order) });
    await LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: ids(order) });

    const label = await OrderLabel.findOne({ storeId: storeA._id, orderId: order._id }).lean();
    expect(label.status).toBe("printed");
  });

  it("refuses to mark a label printed before it has been generated", async () => {
    const order = await makeOrder();
    await expect(
      LabelGenerationService.markLabelsPrinted({ storeId: storeA._id, orderIds: ids(order) })
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("Edge cases", () => {
  it("still prints an order with no phone and no address, showing N/A", async () => {
    const order = await makeOrder({ user_info: { name: "Client Incomplet", city: "" } });

    const result = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
    });

    const text = fullText(result.buffer);
    expect(text).toContain("Client Incomplet");
    expect(text).toContain("ADRESSE: N/A");
    expect(text).toContain("Téléphone: N/A");
  });

  it("prints a clearly-marked draft, with no barcode, when the order has no shipment", async () => {
    const order = await makeOrder();

    const result = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
    });

    expect(result.draftCount).toBe(1);
    const [page] = readPages(result.buffer);
    expect(page.images).toBe(0);
    expect(page.text).toContain("BROUILLON");
    expect(page.text).toContain("NON ATTRIBUÉ");

    const label = await OrderLabel.findOne({ storeId: storeA._id, orderId: order._id }).lean();
    expect(label.isDraft).toBe(true);
    expect(label.trackingNumber).toBeNull();
  });

  it("prints 'Non assigné' rather than failing when no carrier is attached", async () => {
    const order = await makeOrder();
    const result = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
    });
    expect(fullText(result.buffer)).toContain("Non assigné");
  });

  it("hides the amount-to-collect line on a prepaid order instead of printing 0", async () => {
    const prepaid = await makeOrder({ paymentMethod: "credit card", paymentStatus: "paid" });
    const cod = await makeOrder();

    const prepaidText = fullText(
      (await LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: ids(prepaid) })).buffer
    );
    const codText = fullText(
      (await LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: ids(cod) })).buffer
    );

    expect(prepaidText).not.toContain("MONTANT À ENCAISSER");
    expect(codText).toContain("MONTANT À ENCAISSER");
  });

  it("still prints a refunded order, with a return warning and no amount to collect", async () => {
    const order = await makeOrder({ status: "Refunded", paymentStatus: "refunded" });
    await shipOrder(order, "752256410612");

    const text = fullText(
      (await LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: ids(order) })).buffer
    );

    expect(text).toContain("COMMANDE REMBOURSÉE");
    expect(text).not.toContain("MONTANT À ENCAISSER");
  });

  it("prints every line of a multi-product order, paginating when the sheet is full", async () => {
    const order = await makeOrder();
    await OrderItem.create(
      Array.from({ length: 14 }, (_, index) => ({
        orderId: order._id,
        productId: new mongoose.Types.ObjectId(),
        productName: `Article ${index + 1}`,
        sku: `SKU-${index + 1}`,
        quantity: 1,
        unitPrice: 30,
        total: 30,
      }))
    );

    const a4 = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
      format: "a4",
    });
    expect(fullText(a4.buffer)).toContain("Article 14");

    const thermal = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
      format: "label_10x15",
    });
    // The 10x15 sheet cannot hold 14 lines: the label continues on a second
    // page rather than spilling off the edge, and no line is lost.
    expect(pageCount(thermal.buffer)).toBeGreaterThan(1);
    expect(fullText(thermal.buffer)).toContain("Article 14");
    expect(fullText(thermal.buffer)).toContain("suite");
  });

  it("falls back to the embedded cart for an order created before order_items", async () => {
    const order = await makeOrder({
      cart: [{ title: "Produit legacy", quantity: 3, price: 10, itemTotal: 30 }],
    });

    const text = fullText(
      (await LabelGenerationService.generatePackingLabels({ storeId: storeA._id, orderIds: ids(order) })).buffer
    );
    expect(text).toContain("Produit legacy");
    expect(text).toContain("Nombre d'articles: 3");
  });

  it("truncates a very long address instead of overflowing the label", async () => {
    const order = await makeOrder({
      user_info: {
        name: "Client Adresse Longue",
        address: "Rue ".concat("très longue ".repeat(60)),
        city: "Tunis",
      },
    });

    const result = await LabelGenerationService.generatePackingLabels({
      storeId: storeA._id,
      orderIds: ids(order),
      format: "label_10x15",
    });

    const text = fullText(result.buffer);
    expect(text).toContain("…");
    // One page: a long address must not push the rest of the label onto a
    // second sheet.
    expect(pageCount(result.buffer)).toBe(1);
  });
});
