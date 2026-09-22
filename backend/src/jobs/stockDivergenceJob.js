const Store = require("../models/Store");
const Product = require("../models/Product");
const ProductVariation = require("../models/ProductVariation");
const Order = require("../models/Order");
const StockReservation = require("../models/StockReservation");
const logger = require("../config/logger");
const JobLogService = require("../service/JobLogService");

const TERMINAL_ORDER_STATUSES = ["Delivered", "Cancel", "Refunded"];

const detectNegativeProductStock = async (storeId, findings) => {
  const negativeProducts = await Product.find({ storeId, stockQuantity: { $lt: 0 } })
    .select("_id productName stockQuantity")
    .lean();
  for (const p of negativeProducts) {
    findings.push({
      type: "negative_product_stock",
      productId: p._id,
      storeId,
      detail: `${p.productName || p._id} has stockQuantity=${p.stockQuantity}`,
    });
  }
};

const detectStockDivergence = async () => {
  const findings = [];

  const stores = await Store.find({}).select("_id");
  for (const store of stores) {
    await detectNegativeProductStock(store._id, findings);
  }

  // ProductVariation and StockReservation aren't storeScoped (no plugin
  // applied), so these two can run as a single pass across every store.
  const negativeVariations = await ProductVariation.find({ "inventory.quantity": { $lt: 0 } })
    .select("_id productId storeId inventory.quantity")
    .lean();
  for (const v of negativeVariations) {
    findings.push({
      type: "negative_variation_stock",
      variationId: v._id,
      productId: v.productId,
      storeId: v.storeId,
      detail: `variation ${v._id} has inventory.quantity=${v.inventory?.quantity}`,
    });
  }

  const staleReservations = await StockReservation.find({ status: "reserved" })
    .select("_id orderId productId quantity createdAt")
    .lean();
  if (staleReservations.length > 0) {
    const orderIds = [...new Set(staleReservations.map((r) => r.orderId.toString()))];
    const terminalOrders = await Order.find({
      _id: { $in: orderIds },
      status: { $in: TERMINAL_ORDER_STATUSES },
    })
      .select("_id status")
      .lean();
    const terminalStatusByOrder = new Map(terminalOrders.map((o) => [o._id.toString(), o.status]));

    for (const reservation of staleReservations) {
      const terminalStatus = terminalStatusByOrder.get(reservation.orderId.toString());
      if (terminalStatus) {
        findings.push({
          type: "orphaned_reservation",
          reservationId: reservation._id,
          orderId: reservation.orderId,
          detail: `reservation still "reserved" but order is already "${terminalStatus}"`,
        });
      }
    }
  }

  if (findings.length > 0) {
    logger.warn(`stockDivergenceJob: ${findings.length} divergence(s) detected`, {
      findings: findings.slice(0, 20), // cap what hits the log line itself
    });
  }

  return { count: findings.length, findings };
};

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // hourly

const startStockDivergenceJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  const runSafely = () => {
    JobLogService.runJob("stockDivergenceJob", detectStockDivergence).catch((err) =>
      logger.error("stockDivergenceJob failed:", err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = { detectStockDivergence, startStockDivergenceJob };
