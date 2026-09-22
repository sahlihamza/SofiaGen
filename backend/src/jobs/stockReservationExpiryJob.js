const Order = require("../models/Order");
const StockReservation = require("../models/StockReservation");
const stockReservationService = require("../service/stockReservationService");
const logger = require("../config/logger");
const JobLogService = require("../service/JobLogService");

const DEFAULT_PENDING_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

const releaseStalePendingOrders = async (pendingTimeoutMs = DEFAULT_PENDING_TIMEOUT_MS) => {
  const cutoff = new Date(Date.now() - pendingTimeoutMs);

  // Only orders that still hold a "reserved" row are worth touching  no
  // wasted work on orders whose stock was already released/consumed.
  const staleOrderIds = await StockReservation.distinct("orderId", {
    status: "reserved",
    createdAt: { $lte: cutoff },
  });

  if (staleOrderIds.length === 0) {
    return { checked: 0, released: 0 };
  }

  const staleOrders = await Order.find({
    _id: { $in: staleOrderIds },
    status: "Pending",
  }).select("_id status storeId orderNumber");

  let releasedCount = 0;
  for (const order of staleOrders) {
    try {
      const released = await stockReservationService.releaseForOrder(order._id);
      if (released.length > 0) {
        releasedCount += 1;
        // The order itself is dead weight once its stock is back in the
        // catalogue  leaving it "Pending" forever would let it be
        // re-released (or re-paid against stock it no longer holds) later.
        await Order.updateOne(
          { _id: order._id, status: "Pending" },
          { $set: { status: "Cancel", cancelReason: "Expired: no payment confirmation within timeout" } }
        );
      }
    } catch (err) {
      logger.error(`stockReservationExpiryJob: failed to release order ${order._id}: ${err.message}`);
    }
  }

  return { checked: staleOrders.length, released: releasedCount };
};

const startStockReservationExpiryJob = (intervalMs = DEFAULT_INTERVAL_MS, pendingTimeoutMs = DEFAULT_PENDING_TIMEOUT_MS) => {
  const runSafely = () => {
    JobLogService.runJob("stockReservationExpiryJob", () => releaseStalePendingOrders(pendingTimeoutMs)).catch((err) =>
      logger.error("stockReservationExpiryJob failed:", err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = { releaseStalePendingOrders, startStockReservationExpiryJob };
