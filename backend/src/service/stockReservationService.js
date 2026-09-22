const Product = require("../models/Product");
const ProductVariation = require("../models/ProductVariation");
const StockMovement = require("../models/StockMovement");
const StockReservation = require("../models/StockReservation");
const logger = require("../config/logger");
const { emitEvent } = require("../lib/eventBus");

// The decrement is the guard: `stockQuantity: { $gte: quantity }` in the
// filter means two concurrent orders for the last unit can't both succeed 
// the second one matches no document and is reported as out of stock. This
// project runs on a standalone MongoDB (no replica set), so multi-document
// transactions aren't available; instead every line is reverted one by one if
// a later line fails (see reserveStock below).
const decrementProduct = async (line) => {
  // Untracked products have no counter to move: they are always sellable.
  if (!line.manageStock) {
    return { ok: true, previousQuantity: null, currentQuantity: null };
  }

  const product = await Product.findOneAndUpdate(
    { _id: line.productId, stockQuantity: { $gte: line.quantity } },
    { $inc: { stockQuantity: -line.quantity } },
    { new: false }
  );

  if (!product) return { ok: false };

  const previousQuantity = product.stockQuantity;
  const currentQuantity = previousQuantity - line.quantity;

  // Keep the status in sync so the catalogue stops offering a sold-out item.
  if (currentQuantity <= 0) {
    await Product.updateOne({ _id: line.productId }, { $set: { stockStatus: "outofstock" } });
    emitEvent("product.out_of_stock", {
      storeId: product.storeId,
      entityId: product._id,
      metadata: { productName: product.productName, quantity: currentQuantity },
      actionUrl: `/product/${product._id}`,
    });
  } else if (product.lowStockThreshold && currentQuantity <= product.lowStockThreshold) {
    emitEvent("product.low_stock", {
      storeId: product.storeId,
      entityId: product._id,
      metadata: { productName: product.productName, quantity: currentQuantity },
      actionUrl: `/product/${product._id}`,
    });
  }

  return { ok: true, previousQuantity, currentQuantity };
};

const decrementVariation = async (line) => {
  const variation = await ProductVariation.findOneAndUpdate(
    { _id: line.variationId, "inventory.quantity": { $gte: line.quantity } },
    { $inc: { "inventory.quantity": -line.quantity } },
    { new: false }
  );

  if (!variation) return { ok: false };

  const previousQuantity = variation.inventory?.quantity || 0;

  return {
    ok: true,
    previousQuantity,
    currentQuantity: previousQuantity - line.quantity,
  };
};

const restoreLine = async (line) => {
  if (line.variationId) {
    await ProductVariation.updateOne(
      { _id: line.variationId },
      { $inc: { "inventory.quantity": line.quantity } }
    );
    return;
  }

  if (line.manageStock) {
    await Product.updateOne(
      { _id: line.productId },
      { $inc: { stockQuantity: line.quantity }, $set: { stockStatus: "instock" } }
    );
  }
};

/**
 * Takes the ordered quantities out of stock, all or nothing.
 *
 * @returns {Promise<{ok: true, movements: Array} | {ok: false, failedLine: object}>}
 */
const reserveStock = async (lines = [], { orderNumber, note } = {}) => {
  const reserved = [];
  const movements = [];

  for (const line of lines) {
    const result = line.variationId
      ? await decrementVariation(line)
      : await decrementProduct(line);

    if (!result.ok) {
      // Undo whatever this order already took, so a cart that lost a race
      // doesn't leave the catalogue short.
      for (const done of reserved) {
        await restoreLine(done).catch((err) =>
          logger.error("Failed to release reserved stock", err.message)
        );
      }
      return { ok: false, failedLine: line };
    }

    reserved.push(line);

    if (line.manageStock || line.variationId) {
      movements.push({
        product: line.productId,
        quantity: -line.quantity,
        previousQuantity: result.previousQuantity,
        currentQuantity: result.currentQuantity,
        reference: orderNumber,
        note: note || `Commande ${orderNumber || ""}`.trim(),
      });
    }
  }

  if (movements.length > 0) {
    // The audit trail must never block a paid order.
    await StockMovement.insertMany(movements).catch((err) =>
      logger.error("Failed to record stock movements", err.message)
    );
  }

  return { ok: true, movements };
};

// Used when an order is cancelled before it ships.
const releaseStock = async (lines = []) => {
  for (const line of lines) {
    await restoreLine(line).catch((err) =>
      logger.error("Failed to release stock", err.message)
    );
  }
};

// --------------------------------------------------------------------------
// stock_reservations  who is holding what
// --------------------------------------------------------------------------

// A line only holds stock if something counts it. An untracked product is
// always sellable, so it holds nothing and gets no row  the same condition
// that decides whether a StockMovement is written above.
const holdsStock = (line) => !!(line.manageStock || line.variationId);

/**
 * Writes down what the order is holding. Called once the order exists, right
 * after reserveStock has taken the units out.
 */
const recordForOrder = async (orderId, lines = []) => {
  const rows = lines.filter(holdsStock).map((line) => ({
    orderId,
    productId: line.productId,
    variationId: line.variationId || null,
    quantity: line.quantity,
    status: "reserved",
  }));

  if (rows.length === 0) return [];

  return StockReservation.insertMany(rows);
};

/**
 * Gives back everything an order still holds, and says so on each row.
 *
 * Each hold is claimed atomically before its units are credited back, so two
 * releases racing on the same order  a webhook and an admin, say  can never
 * both put the same units back in the catalogue.
 */
const releaseForOrder = async (orderId) => {
  const reservations = await StockReservation.find({ orderId, status: "reserved" });
  const released = [];

  for (const reservation of reservations) {
    const claimed = await StockReservation.findOneAndUpdate(
      { _id: reservation._id, status: "reserved" },
      { $set: { status: "released" } }
    );

    // Somebody else got there first: their release credits the units.
    if (!claimed) continue;

    await restoreLine({
      productId: reservation.productId,
      variationId: reservation.variationId,
      quantity: reservation.quantity,
      // A row only exists for a line that holds stock.
      manageStock: true,
    }).catch((err) => logger.error("Failed to release reserved stock", err.message));

    released.push(reservation);
  }

  return released;
};

/**
 * Closes the holds of an order that shipped. No stock moves: the units left
 * the catalogue when they were reserved, this only records that they are gone
 * for good and can no longer be given back.
 */
const consumeForOrder = async (orderId) => {
  const result = await StockReservation.updateMany(
    { orderId, status: "reserved" },
    { $set: { status: "consumed" } }
  );

  return result.nModified ?? result.modifiedCount ?? 0;
};

// Used when the order it belonged to could not be created: the units are given
// back by the caller from the cart lines, so these rows must go without
// crediting anything a second time.
const deleteForOrder = (orderId) => StockReservation.deleteMany({ orderId });

const getByOrderId = (orderId) => StockReservation.find({ orderId }).sort({ createdAt: 1 });

const list = async ({ page, limit, status, orderId, productId } = {}) => {
  const query = {};

  if (status) query.status = String(status).toLowerCase();
  if (orderId) query.orderId = orderId;
  if (productId) query.productId = productId;

  const pages = Number(page) || 1;
  const limits = Number(limit) || 20;
  const skip = (pages - 1) * limits;

  const [reservations, totalDoc] = await Promise.all([
    StockReservation.find(query)
      .populate("orderId", "orderNumber invoice status")
      .populate("productId", "productName sku")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limits),
    StockReservation.countDocuments(query),
  ]);

  return { reservations, totalDoc, pages, limits };
};

module.exports = {
  reserveStock,
  releaseStock,
  recordForOrder,
  releaseForOrder,
  consumeForOrder,
  deleteForOrder,
  getByOrderId,
  list,
  // exported for tests
  holdsStock,
};
