const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Plan = require("../models/Plan");
const UsageCounter = require("../models/UsageCounter");
const InvoiceStateMachine = require("./InvoiceStateMachine");
const BillingReconciliationService = require("./BillingReconciliationService");
const { STATUS: SUB_STATUS, expandForQuery } = require("../utils/subscriptionStatus");

const REPORT_TYPES = [
  "mrr",
  "arr",
  "active_subscriptions",
  "churn",
  "trials",
  "plan_changes",
  "overdue_invoices",
  "failed_payments",
  "usage_overages",
  "revenue_by_plan",
  "anomalies",
];

const badRequest = (message, code = "BAD_REQUEST") => {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
};

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

const MONTHS_PER_CYCLE = { monthly: 1, quarterly: 3, semi_annual: 6, yearly: 12, annual: 12 };

const monthlyValue = (subscription) => {
  const price = Number(subscription.finalPrice ?? subscription.unitPrice ?? subscription.basePriceInCurrency ?? 0);
  if (!price) return 0;
  const months = MONTHS_PER_CYCLE[subscription.billingCycle] || 1;
  return price / months;
};

const scopeFilter = ({ storeId }) => {
  if (!storeId) return {};
  if (!mongoose.Types.ObjectId.isValid(storeId)) throw badRequest("storeId invalide");
  return { storeId: new mongoose.Types.ObjectId(storeId) };
};

const billableSubscriptions = async (filter) =>
  Subscription.find({
    ...filter,
    status: { $in: expandForQuery([SUB_STATUS.ACTIVE, SUB_STATUS.PAST_DUE, SUB_STATUS.GRACE_PERIOD]) },
  })
    .select("storeId planId billingCycle currency unitPrice finalPrice basePriceInCurrency currentPlanName")
    .lean();

const computeMrr = async (filter) => {
  const subs = await billableSubscriptions(filter);
  const byCurrency = {};

  for (const sub of subs) {
    const currency = sub.currency || "USD";
    byCurrency[currency] = round2((byCurrency[currency] || 0) + monthlyValue(sub));
  }

  const total = round2(Object.values(byCurrency).reduce((a, b) => a + b, 0));
  return { mrr: total, byCurrency, subscriptionCount: subs.length };
};

const REPORTS = {
  mrr: async (filter) => computeMrr(filter),

  arr: async (filter) => {
    const { mrr, byCurrency, subscriptionCount } = await computeMrr(filter);
    return {
      arr: round2(mrr * 12),
      mrr,
      byCurrency: Object.fromEntries(Object.entries(byCurrency).map(([c, v]) => [c, round2(v * 12)])),
      subscriptionCount,
    };
  },

  active_subscriptions: async (filter) => {
    const rows = await Subscription.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const byStatus = rows.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});
    const active = await Subscription.countDocuments({
      ...filter,
      status: { $in: expandForQuery([SUB_STATUS.ACTIVE, SUB_STATUS.TRIALING, SUB_STATUS.PAST_DUE, SUB_STATUS.GRACE_PERIOD]) },
    });
    return { active, byStatus, total: rows.reduce((a, r) => a + r.count, 0) };
  },

  churn: async (filter, { from, to }) => {
    const window = {};
    if (from) window.$gte = new Date(from);
    if (to) window.$lte = new Date(to);

    const cancelledFilter = { ...filter, status: { $in: expandForQuery([SUB_STATUS.CANCELLED, SUB_STATUS.EXPIRED]) } };
    if (Object.keys(window).length) cancelledFilter.cancelledAt = window;

    const [cancelled, stillActive] = await Promise.all([
      Subscription.countDocuments(cancelledFilter),
      Subscription.countDocuments({
        ...filter,
        status: { $in: expandForQuery([SUB_STATUS.ACTIVE, SUB_STATUS.TRIALING, SUB_STATUS.PAST_DUE]) },
      }),
    ]);

    const base = cancelled + stillActive;
    return {
      cancelled,
      stillActive,
      churnRate: base > 0 ? round2((cancelled / base) * 100) : 0,
      window: { from: from || null, to: to || null },
    };
  },

  trials: async (filter) => {
    const [active, converted, expired] = await Promise.all([
      Subscription.countDocuments({ ...filter, status: { $in: expandForQuery([SUB_STATUS.TRIALING]) } }),
      Subscription.countDocuments({
        ...filter,
        trialEndsAt: { $ne: null },
        status: { $in: expandForQuery([SUB_STATUS.ACTIVE]) },
      }),
      Subscription.countDocuments({
        ...filter,
        trialEndsAt: { $ne: null },
        status: { $in: expandForQuery([SUB_STATUS.EXPIRED, SUB_STATUS.CANCELLED]) },
      }),
    ]);
    const finished = converted + expired;
    return {
      active,
      converted,
      expired,
      conversionRate: finished > 0 ? round2((converted / finished) * 100) : 0,
    };
  },

  plan_changes: async (filter, { from, to }) => {
    const PlanChangeRequest = require("../models/PlanChangeRequest");
    const query = { ...filter };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    const rows = await PlanChangeRequest.aggregate([
      { $match: query },
      { $group: { _id: { direction: "$direction", status: "$status" }, count: { $sum: 1 } } },
    ]);
    const upgrades = rows.filter((r) => r._id.direction === "upgrade").reduce((a, r) => a + r.count, 0);
    const downgrades = rows.filter((r) => r._id.direction === "downgrade").reduce((a, r) => a + r.count, 0);
    return { upgrades, downgrades, detail: rows.map((r) => ({ ...r._id, count: r.count })) };
  },

  overdue_invoices: async (filter) => {
    const invoices = await Invoice.find({
      ...filter,
      status: { $in: InvoiceStateMachine.expandForQuery(["past_due", "open"]) },
      dueDate: { $ne: null, $lt: new Date() },
    })
      .select("invoiceNumber storeId total currency dueDate status")
      .sort({ dueDate: 1 })
      .limit(200)
      .lean();

    const amount = round2(invoices.reduce((a, i) => a + (Number(i.total) || 0), 0));
    return { count: invoices.length, amount, invoices };
  },

  failed_payments: async (filter, { from, to }) => {
    const query = { ...filter, status: { $in: ["failed", "cancelled"] } };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    const payments = await Payment.find(query)
      .select("amount currency status createdAt storeId")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return {
      count: payments.length,
      amount: round2(payments.reduce((a, p) => a + (Number(p.amount) || 0), 0)),
      payments,
    };
  },

  usage_overages: async (filter) => {
    const counters = await UsageCounter.find({ ...filter, included: { $gt: 0 } })
      .select("storeId quotaTypeCode used included periodStart periodEnd")
      .lean();

    const over = counters.filter((c) => Number(c.used) > Number(c.included));
    return {
      countersScanned: counters.length,
      overQuotaCount: over.length,
      items: over.map((c) => ({
        storeId: c.storeId,
        quotaTypeCode: c.quotaTypeCode,
        used: c.used,
        included: c.included,
        excess: Number(c.used) - Number(c.included),
      })),
    };
  },

  revenue_by_plan: async (filter, { from, to }) => {
    const match = {
      ...filter,
      status: { $in: InvoiceStateMachine.expandForQuery(["paid"]) },
    };
    if (from || to) {
      match.paidAt = {};
      if (from) match.paidAt.$gte = new Date(from);
      if (to) match.paidAt.$lte = new Date(to);
    }

    const rows = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: { planId: "$planId", currency: "$currency" },
          revenue: { $sum: "$total" },
          invoices: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    const planIds = [...new Set(rows.map((r) => String(r._id.planId)).filter(Boolean))];
    const plans = await Plan.find({ _id: { $in: planIds } }).select("name slug").lean();
    const planMap = new Map(plans.map((p) => [String(p._id), p]));

    return {
      rows: rows.map((r) => ({
        planId: r._id.planId,
        planName: planMap.get(String(r._id.planId))?.name || null,
        currency: r._id.currency,
        revenue: round2(r.revenue),
        invoices: r.invoices,
      })),
      total: round2(rows.reduce((a, r) => a + r.revenue, 0)),
    };
  },

  anomalies: async (filter) =>
    BillingReconciliationService.detectAnomalies({ storeId: filter.storeId || null }),
};

const getReport = async (type, { storeId = null, from = null, to = null } = {}) => {
  if (!type) throw badRequest("Le paramètre 'type' est obligatoire", "REPORT_TYPE_REQUIRED");
  if (!REPORT_TYPES.includes(type)) {
    throw badRequest(
      `Type de rapport inconnu : "${type}". Types disponibles : ${REPORT_TYPES.join(", ")}`,
      "UNKNOWN_REPORT_TYPE"
    );
  }

  const filter = scopeFilter({ storeId });
  const data = await REPORTS[type](filter, { from, to });

  return {
    type,
    scope: storeId ? { storeId } : { scope: "platform" },
    generatedAt: new Date(),
    data,
  };
};

module.exports = { REPORT_TYPES, getReport, monthlyValue, MONTHS_PER_CYCLE };
