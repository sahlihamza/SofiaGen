const mongoose = require("mongoose");
const dayjs = require("dayjs");
const Overage = require("../models/Overage");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const PlanQuota = require("../models/PlanQuota");
const StoreUsage = require("../models/StoreUsage");
const Invoice = require("../models/Invoice");
const OverageWaiver = require("../models/OverageWaiver");

/**
 * OverageService (P6)
 *
 * Calculates and bills overage usage for a subscription over a billing period.
 */

/* ------------------------- CRUD ------------------------- */

const listOverages = async ({ page = 1, limit = 20, search = "", status = "", quotaTypeCode = "", planId = "", sort = "-createdAt" } = {}) => {
  const skip = (page - 1) * limit;
  const query = {};
  if (search) {
    query.$or = [
      { quotaTypeCode: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  if (status) query.status = status;
  if (quotaTypeCode) query.quotaTypeCode = quotaTypeCode.toLowerCase();
  if (planId && mongoose.Types.ObjectId.isValid(planId)) query.planIds = planId;

  const sortObject = {};
  const field = sort.replace(/^-/, "");
  sortObject[field] = sort.startsWith("-") ? -1 : 1;

  const total = await Overage.countDocuments(query);
  const docs = await Overage.find(query)
    .populate("quotaTypeId", "code name")
    .populate("planIds", "name slug")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort(sortObject)
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    data: docs,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / limit),
    },
  };
};

const getOverage = async (id) => {
  const doc = await Overage.findById(id)
    .populate("quotaTypeId", "code name")
    .populate("planIds", "name slug");
  if (!doc) throw new Error("Overage rule not found");
  return doc;
};

const createOverage = async (payload) => {
  const { quotaTypeCode, unitPrice } = payload;
  if (!quotaTypeCode || unitPrice == null) throw new Error("quotaTypeCode and unitPrice are required");

  const overage = await Overage.create({
    ...payload,
    quotaTypeCode: String(quotaTypeCode).trim().toLowerCase(),
    createdBy: payload.createdBy,
  });
  return getOverage(overage._id);
};

const updateOverage = async (id, payload, updatedBy) => {
  const overage = await Overage.findById(id);
  if (!overage) throw new Error("Overage rule not found");

  const { quotaTypeCode, quotaTypeId, planIds, appliesToAllPlans, threshold, unitPrice, currency, billingStrategy, maxOverage, minBillableQty, roundingMode, name, description, status } = payload;

  if (quotaTypeCode) overage.quotaTypeCode = String(quotaTypeCode).trim().toLowerCase();
  if (quotaTypeId) overage.quotaTypeId = quotaTypeId;
  if (planIds) overage.planIds = planIds;
  if (appliesToAllPlans !== undefined) overage.appliesToAllPlans = appliesToAllPlans;
  if (threshold !== undefined) overage.threshold = threshold;
  if (unitPrice !== undefined) overage.unitPrice = unitPrice;
  if (currency) overage.currency = currency;
  if (billingStrategy) overage.billingStrategy = billingStrategy;
  if (maxOverage !== undefined) overage.maxOverage = maxOverage;
  if (minBillableQty !== undefined) overage.minBillableQty = minBillableQty;
  if (roundingMode) overage.roundingMode = roundingMode;
  if (name !== undefined) overage.name = name;
  if (description !== undefined) overage.description = description;
  if (status) overage.status = status;
  overage.updatedBy = updatedBy;
  await overage.save();
  return getOverage(overage._id);
};

const deleteOverage = async (id) => {
  const doc = await Overage.findByIdAndDelete(id);
  if (!doc) throw new Error("Overage rule not found");
  return doc;
};

const updateOverageStatus = async (id, status, updatedBy) => {
  const overage = await Overage.findById(id);
  if (!overage) throw new Error("Overage rule not found");
  overage.status = status;
  overage.updatedBy = updatedBy;
  await overage.save();
  return overage;
};

/* ------------------------- Calculation engine ------------------------- */

const findApplicableRules = async ({ planId }) => {
  return Overage.find({
    status: "active",
    $or: [{ appliesToAllPlans: true }, { planIds: planId }],
  });
};

const roundAmount = (value, mode = "none") => {
  switch (mode) {
    case "up":
      return Math.ceil(value);
    case "down":
      return Math.floor(value);
    case "nearest":
      return Math.round(value);
    case "none":
    default:
      return Math.round(value * 100) / 100;
  }
};

/**
 * Calculate overage for a subscription over a period.
 * Returns an array of overage line items.
 */
const calculateOverage = async ({ subscriptionId, periodStart, periodEnd }) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");

  const start = periodStart ? new Date(periodStart) : subscription.currentPeriodStart || dayjs().subtract(1, "month").toDate();
  const end = periodEnd ? new Date(periodEnd) : subscription.currentPeriodEnd || dayjs().toDate();

  const rules = await findApplicableRules({ planId: subscription.planId });
  if (!rules.length) return { subscriptionId, periodStart: start, periodEnd: end, items: [], total: 0 };

  // Load the plan's included quotas
  const includedQuota = await PlanQuota.find({ planId: subscription.planId });
  const quotaByCode = new Map(includedQuota.map((q) => [q.quotaTypeCode, q]));

  // Load actual usage
  const storeUsages = await StoreUsage.find({ storeId: subscription.storeId });
  const usageByCode = new Map(storeUsages.map((u) => [u.quotaTypeCode, u.used]));

  const activeWaivers = await OverageWaiver.find({
    subscriptionId,
    status: "waived",
    periodStart: { $lte: end },
    periodEnd: { $gte: start },
  }).lean();
  const waivedRuleIds = new Set(activeWaivers.map((w) => String(w.overageRuleId)));

  const items = [];
  const waivedItems = [];
  let total = 0;

  for (const rule of rules) {
    const included = rule.threshold != null
      ? rule.threshold
      : quotaByCode.get(rule.quotaTypeCode)?.limitValue || 0;

    const used = usageByCode.get(rule.quotaTypeCode) || 0;
    const excess = Math.max(0, used - included);

    if (excess <= 0) continue;

    let billableQty = Math.floor(excess);
    if (billableQty < rule.minBillableQty) billableQty = 0;

    if (billableQty <= 0) continue;

    // Enforce max overage
    let cappedQty = billableQty;
    if (rule.maxOverage > 0 && billableQty > rule.maxOverage) {
      cappedQty = rule.maxOverage;
    }

    const amount = roundAmount(cappedQty * rule.unitPrice, rule.roundingMode);

    if (waivedRuleIds.has(String(rule._id))) {
      waivedItems.push({
        quotaTypeCode: rule.quotaTypeCode,
        overageRuleId: rule._id,
        name: rule.name || rule.quotaTypeCode,
        billableQty: cappedQty,
        unitPrice: rule.unitPrice,
        amount: roundAmount(cappedQty * rule.unitPrice, rule.roundingMode),
        currency: rule.currency || subscription.currency || "USD",
      });
      continue;
    }

    items.push({
      quotaTypeCode: rule.quotaTypeCode,
      overageRuleId: rule._id,
      name: rule.name || rule.quotaTypeCode,
      included,
      used,
      excess,
      billableQty: cappedQty,
      unitPrice: rule.unitPrice,
      currency: rule.currency || subscription.currency || "USD",
      billingStrategy: rule.billingStrategy,
      amount,
    });

    total += amount;
  }

  return {
    subscriptionId,
    planId: subscription.planId,
    storeId: subscription.storeId,
    periodStart: start,
    periodEnd: end,
    items,
    waivedItems,
    waivedTotal: roundAmount(waivedItems.reduce((sum, i) => sum + i.amount, 0), "none"),
    total: roundAmount(total, "none"),
    currency: subscription.currency || "USD",
  };
};

/**
 * Generate an overage invoice (or append overage items to an invoice).
 */
const generateOverageInvoice = async ({ subscriptionId, periodStart, periodEnd, invoiceId }) => {
  const result = await calculateOverage({ subscriptionId, periodStart, periodEnd });
  if (!result.items.length) {
    return { status: "no_overage", ...result };
  }

  const subscription = await Subscription.findById(subscriptionId);

  if (invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    invoice.items.push(
      ...result.items.map((i) => ({
        description: `Overage: ${i.name} (${i.billableQty} @ ${i.unitPrice})`,
        quantity: i.billableQty,
        unitPrice: i.unitPrice,
        total: i.amount,
      }))
    );
    invoice.baseAmount = (invoice.baseAmount || 0) + result.total;
    invoice.subtotal = (invoice.subtotal || 0) + result.total;
    invoice.total = (invoice.total || 0) + result.total;
    invoice.metadata = { ...(invoice.metadata || {}), overages: result.items };
    await invoice.save();
    return { status: "appended", invoiceId: invoice._id, ...result };
  }

  const invoice = await Invoice.create({
    storeId: subscription.storeId,
    subscriptionId: subscription._id,
    planId: subscription.planId,
    items: result.items.map((i) => ({
      description: `Overage: ${i.name} (${i.billableQty} @ ${i.unitPrice})`,
      quantity: i.billableQty,
      unitPrice: i.unitPrice,
      total: i.amount,
    })),
    baseAmount: result.total,
    subtotal: result.total,
    tax: 0,
    total: result.total,
    currency: result.currency,
    status: "sent",
    dueDate: dayjs().add(7, "day").toDate(),
    issuedAt: new Date(),
    metadata: { overages: result.items, type: "overage" },
  });
  return { status: "created", invoiceId: invoice._id, ...result };
};

module.exports = {
  listOverages,
  getOverage,
  createOverage,
  updateOverage,
  deleteOverage,
  updateOverageStatus,
  findApplicableRules,
  calculateOverage,
  generateOverageInvoice,
};
