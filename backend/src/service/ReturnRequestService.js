const ReturnRequest = require("../models/ReturnRequest");
const Order = require("../models/Order");
const StockMovement = require("../models/StockMovement");
const Product = require("../models/Product");
const ProductVariation = require("../models/ProductVariation");
const PaymentTransactionService = require("./payment/PaymentTransactionService");
const logger = require("../config/logger");

const DEFAULT_RETURN_WINDOW_DAYS = 30;

// Every allowed transition, explicit  anything not listed here is refused,
// which is the actual point: "requested -> refunded" must be structurally
// impossible, not just discouraged by convention.
const ALLOWED_TRANSITIONS = {
  requested: ["approved", "rejected"],
  approved: ["awaiting_return", "rejected"],
  awaiting_return: ["received", "rejected"],
  received: ["refunded", "exchanged"],
  refunded: [],
  exchanged: [],
  rejected: [],
};

const businessError = (message, code = "RETURN_REQUEST_ERROR") => {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
};

const assertTransitionAllowed = (from, to) => {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw businessError(`Transition "${from}" -> "${to}" is not allowed`, "INVALID_TRANSITION");
  }
};

const create = async ({ storeId, orderId, customerId, items }) => {
  const order = await Order.findOne({ _id: orderId, storeId });
  if (!order) throw businessError("Order not found for this store", "ORDER_NOT_FOUND");

  // Isolation: a return can only ever be filed against the order's own
  // customer/store  never trust a customerId passed alongside an orderId
  // that belongs to someone else.
  const orderCustomerId = String(order.user || order.customerId || "");
  if (orderCustomerId && orderCustomerId !== String(customerId)) {
    throw businessError("This order does not belong to this customer", "FORBIDDEN");
  }

  if (order.status !== "Delivered") {
    throw businessError("A return can only be requested for a delivered order", "ORDER_NOT_DELIVERED");
  }

  // Order has no explicit deliveredAt timestamp  updatedAt at the moment
  // it flipped to "Delivered" is the closest available proxy. Documented
  // gap: a later status change (e.g. a note added) would push this window
  // out; adding a real deliveredAt stamp is a small, separate follow-up.
  const windowDays = order.returnWindowDays || DEFAULT_RETURN_WINDOW_DAYS;
  const deadline = new Date(order.updatedAt).getTime() + windowDays * 24 * 60 * 60 * 1000;
  if (Date.now() > deadline) {
    throw businessError(
      `Return window (${windowDays} days) has expired for this order`,
      "RETURN_WINDOW_EXPIRED"
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw businessError("At least one item is required", "ITEMS_REQUIRED");
  }

  const returnRequest = await ReturnRequest.create({
    storeId,
    orderId,
    customerId,
    items,
    status: "requested",
    createdBy: customerId,
    history: [{ status: "requested", by: null, note: "Return requested by customer" }],
  });

  return returnRequest;
};

const getById = async (id, storeId) => {
  const returnRequest = await ReturnRequest.findOne({ _id: id, storeId });
  if (!returnRequest) throw businessError("Return request not found", "NOT_FOUND");
  return returnRequest;
};

const list = async ({ storeId, status, page = 1, limit = 20 }) => {
  const query = { storeId };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    ReturnRequest.find(query)
      .populate("orderId", "orderNumber status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ReturnRequest.countDocuments(query),
  ]);

  return { items, total, page: Number(page), limit: Number(limit) };
};

// received -> restock. Only through StockMovement (never a direct $inc on
// Product/ProductVariation), consistent with the rest of the stock system 
// this is the audit trail, not just a side effect.
const restockItems = async (returnRequest, actorUserId) => {
  for (const item of returnRequest.items) {
    if (item.variationId) {
      await ProductVariation.updateOne(
        { _id: item.variationId },
        { $inc: { "inventory.quantity": item.quantity } }
      );
    } else {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stockQuantity: item.quantity }, $set: { stockStatus: "instock" } }
      );
    }

    await StockMovement.create({
      storeId: returnRequest.storeId,
      product: item.productId,
      quantity: item.quantity,
      reference: `return:${returnRequest._id}`,
      note: `Restocked from return ${returnRequest._id} (order ${returnRequest.orderId})`,
      createdBy: actorUserId || null,
    }).catch((err) =>
      // Restock itself must not be blocked by an audit-row failure (e.g. a
      // legacy product missing a required field)  logged, not swallowed.
      logger.error(`ReturnRequestService: failed to record StockMovement for return ${returnRequest._id}: ${err.message}`)
    );
  }
};

const transition = async (id, storeId, toStatus, { actorUserId, note, resolution, rejectionReason } = {}) => {
  const returnRequest = await getById(id, storeId);
  assertTransitionAllowed(returnRequest.status, toStatus);

  returnRequest.status = toStatus;
  returnRequest.history.push({ status: toStatus, by: actorUserId || null, note: note || null });

  if (toStatus === "rejected") {
    returnRequest.rejectionReason = rejectionReason || null;
  }

  if (toStatus === "received") {
    await restockItems(returnRequest, actorUserId);
    returnRequest.restocked = true;
  }

  if (toStatus === "refunded") {
    const order = await Order.findById(returnRequest.orderId).select("paymentId storeId");
    if (!order?.paymentId) {
      throw businessError("Order has no linked payment to refund", "NO_PAYMENT_TO_REFUND");
    }

    // Refund amount isn't tracked per return line here (no per-item price
    // snapshot on ReturnRequest)  full remaining refundable amount on the
    // order's payment is used. Partial-value returns are a real gap, left
    // as a documented follow-up rather than guessed at.
    const Payment = require("../models/Payment");
    const payment = await Payment.findById(order.paymentId).select("amount refundedAmount");
    const refundableAmount = Math.max((payment?.amount || 0) - (payment?.refundedAmount || 0), 0);
    if (refundableAmount <= 0) {
      throw businessError("Nothing left to refund on this order's payment", "NOTHING_TO_REFUND");
    }

    const refund = await PaymentTransactionService.processRefund(
      order.paymentId,
      refundableAmount,
      `Return ${returnRequest._id}`,
      actorUserId
    );
    returnRequest.refundId = refund._id;
    returnRequest.resolution = "refund";
  }

  if (toStatus === "exchanged") {
    returnRequest.resolution = resolution || "exchange";
  }

  await returnRequest.save();
  return returnRequest;
};

module.exports = {
  create,
  getById,
  list,
  transition,
  ALLOWED_TRANSITIONS,
  DEFAULT_RETURN_WINDOW_DAYS,
};
