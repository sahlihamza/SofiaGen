const OrderStatusHistory = require("../models/OrderStatusHistory");
const logger = require("../config/logger");

/**
 * Appends one transition to an order's timeline.
 *
 * Never throws and never returns a rejected promise: an audit trail that can
 * block a status change  or worse, a paid order  is a liability. A write
 * that fails is logged and the caller carries on.
 *
 * @param {object|string} orderId
 * @param {string} status - the status the order moved to
 * @param {object} [options]
 * @param {string} [options.comment] - why, when someone said
 * @param {object|string} [options.changedBy] - back-office user, null if the
 *   application moved the order on its own
 */
const record = async (orderId, status, { comment, changedBy } = {}) => {
  try {
    return await OrderStatusHistory.create({
      orderId,
      status,
      comment: comment || "",
      changedBy: changedBy || null,
    });
  } catch (err) {
    logger.error("Failed to record order status history", err.message);
    return null;
  }
};

const getByOrderId = (orderId) =>
  OrderStatusHistory.find({ orderId })
    .sort({ createdAt: 1 })
    .populate("changedBy", "name email");

module.exports = { record, getByOrderId };
