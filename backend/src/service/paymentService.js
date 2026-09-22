const dayjs = require("dayjs");
const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const Subscription = require("../models/Subscription");
const Store = require("../models/Store");
const { emitEvent } = require("../lib/eventBus");

const GATEWAYS = {
  stripe: {
    name: "Stripe",
    supportedCurrencies: ["usd", "eur", "gbp", "cad", "aud", "jpy"],
  },
  paypal: {
    name: "PayPal",
    supportedCurrencies: ["usd", "eur", "gbp", "cad", "aud"],
  },
  razorpay: {
    name: "Razorpay",
    supportedCurrencies: ["inr", "usd", "eur", "gbp"],
  },
  manual: {
    name: "Manual",
    supportedCurrencies: ["*"],
  },
};

const validateGateway = (gateway, currency = "USD") => {
  const gw = GATEWAYS[gateway];
  if (!gw) throw new Error(`Payment gateway '${gateway}' is not supported`);
  if (!gw.supportedCurrencies.includes("*") && !gw.supportedCurrencies.includes(currency.toLowerCase())) {
    throw new Error(`Currency '${currency}' is not supported by gateway '${gateway}'`);
  }
  return gw;
};

const createPayment = async ({ storeId, invoiceId, subscriptionId, amount, currency, method, gateway, transactionId, status = "pending", metadata }) => {
  const gatewayConfig = validateGateway(gateway, currency);

  const payment = await Payment.create({
    storeId,
    invoiceId,
    subscriptionId,
    amount,
    currency: currency || "USD",
    method,
    gateway,
    transactionId,
    status,
    paidAt: status === "paid" ? new Date() : undefined,
    metadata,
  });

  if (invoiceId && status === "paid") {
    await Invoice.findByIdAndUpdate(invoiceId, {
      status: "paid",
      paidAt: new Date(),
      paymentId: payment._id,
    });
  }

  if (subscriptionId && status === "paid") {
    const subscription = await Subscription.findById(subscriptionId);
    if (subscription) {
      subscription.status = "active";
      subscription.chargeFailures = 0;
      await subscription.save();
    }
  }

  if (status === "paid" || status === "failed") {
    emitEvent(status === "paid" ? "payment.paid" : "payment.failed", {
      storeId,
      entityId: payment._id,
      metadata: { paymentAmount: `${amount} ${(currency || "USD").toUpperCase()}` },
      actionUrl: `/dashboard/payments/${payment._id}`,
    });
  }

  return payment;
};

const getPayments = async ({ page = 1, limit = 20, status = "", storeId = "", gateway = "", method = "", search = "", sort = "-createdAt" } = {}) => {
  const query = {};
  if (status) query.status = status;
  if (storeId) query.storeId = storeId;
  if (gateway) query.gateway = gateway;
  if (method) query.method = method;
  if (search) {
    query.$or = [
      { transactionId: { $regex: search, $options: "i" } },
      { method: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Payment.countDocuments(query);
  const payments = await Payment.find(query)
    .populate("storeId", "name")
    .populate("invoiceId", "invoiceNumber status total currency")
    .populate("subscriptionId", "status billingCycle")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    data: payments,
    pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / limit) },
  };
};

const getPaymentById = async (id) => {
  const payment = await Payment.findById(id)
    .populate("storeId", "name email")
    .populate("invoiceId", "invoiceNumber status total currency")
    .populate("subscriptionId", "status billingCycle");
  if (!payment) throw new Error("Payment not found");
  return payment;
};

const processPayment = async (paymentId, gatewayResponse, actor) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "pending") throw new Error("Payment is not pending");

  payment.status = gatewayResponse.success ? "paid" : "failed";
  payment.transactionId = gatewayResponse.transactionId || payment.transactionId;
  payment.gatewayResponse = gatewayResponse;
  payment.paidAt = gatewayResponse.success ? new Date() : undefined;
  await payment.save();

  if (gatewayResponse.success && payment.invoiceId) {
    await Invoice.findByIdAndUpdate(payment.invoiceId, {
      status: "paid",
      paidAt: new Date(),
      paymentId: payment._id,
    });
  }

  if (gatewayResponse.success && payment.subscriptionId) {
    const subscription = await Subscription.findById(payment.subscriptionId);
    if (subscription) {
      subscription.status = "active";
      subscription.chargeFailures = 0;
      await subscription.save();
    }
  }

  emitEvent(gatewayResponse.success ? "payment.paid" : "payment.failed", {
    storeId: payment.storeId,
    entityId: payment._id,
    metadata: { paymentAmount: `${payment.amount} ${(payment.currency || "USD").toUpperCase()}` },
    actionUrl: `/dashboard/payments/${payment._id}`,
  });

  return payment;
};

const retryPayment = async (paymentId, actor) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "failed") throw new Error("Only failed payments can be retried");

  payment.status = "pending";
  payment.retryCount = (payment.retryCount || 0) + 1;
  payment.retriedAt = new Date();
  await payment.save();

  return payment;
};

const getPaymentStats = async ({ storeId, gateway, startDate, endDate } = {}) => {
  const query = {};
  if (storeId) query.storeId = storeId;
  if (gateway) query.gateway = gateway;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const stats = await Payment.aggregate([
    { $match: query },
    {
      $group: {
        _id: { status: "$status", gateway: "$gateway" },
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.status": 1, "_id.gateway": 1 } },
  ]);

  const totalPayments = await Payment.countDocuments(query);
  const totalPaid = await Payment.aggregate([
    { $match: { ...query, status: "paid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return {
    stats,
    totalPayments,
    totalPaidAmount: totalPaid[0]?.total || 0,
  };
};

const getSupportedGateways = () => {
  return Object.entries(GATEWAYS).map(([key, gw]) => ({
    id: key,
    name: gw.name,
    supportedCurrencies: gw.supportedCurrencies,
  }));
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  processPayment,
  retryPayment,
  getPaymentStats,
  getSupportedGateways,
  GATEWAYS,
};