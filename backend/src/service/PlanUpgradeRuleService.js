const mongoose = require("mongoose");
const dayjs = require("dayjs");
const Plan = require("../models/Plan");
const Store = require("../models/Store");
const PlanUpgradeRule = require("../models/PlanUpgradeRule");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");

/**
 * PlanUpgradeRuleService (P4)
 *
 * CRUD for upgrade rules + a billing engine that computes HOW an upgrade is
 * billed (immediate / prorata / next_renewal / manual_approval).
 */

/* ------------------------- CRUD ------------------------- */

const listRules = async ({ page = 1, limit = 20, search = "", status = "", fromPlanId = "", toPlanId = "", sort = "-createdAt" } = {}) => {
  const skip = (page - 1) * limit;
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  if (status) query.status = status;
  if (fromPlanId && mongoose.Types.ObjectId.isValid(fromPlanId)) query.fromPlanId = fromPlanId;
  if (toPlanId && mongoose.Types.ObjectId.isValid(toPlanId)) query.toPlanId = toPlanId;

  const sortObject = {};
  const field = sort.replace(/^-/, "");
  sortObject[field] = sort.startsWith("-") ? -1 : 1;

  const total = await PlanUpgradeRule.countDocuments(query);
  const docs = await PlanUpgradeRule.find(query)
    .populate("fromPlanId", "name slug pricing")
    .populate("toPlanId", "name slug pricing")
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

const getRule = async (id) => {
  const doc = await PlanUpgradeRule.findById(id)
    .populate("fromPlanId", "name slug pricing")
    .populate("toPlanId", "name slug pricing")
    .populate("storeIds", "name");
  if (!doc) throw new Error("Upgrade rule not found");
  return doc;
};

const createRule = async (payload) => {
  const { fromPlanId, toPlanId, name } = payload;
  if (!fromPlanId || !toPlanId || !name) throw new Error("fromPlanId, toPlanId and name are required");
  if (!mongoose.Types.ObjectId.isValid(fromPlanId) || !mongoose.Types.ObjectId.isValid(toPlanId)) {
    throw new Error("Invalid plan id");
  }
  if (String(fromPlanId) === String(toPlanId)) {
    throw new Error("fromPlanId and toPlanId must be different");
  }

  const fromPlan = await Plan.findById(fromPlanId);
  const toPlan = await Plan.findById(toPlanId);
  if (!fromPlan || !toPlan) throw new Error("Source or target plan not found");

  // Validate ordering by price (upgrade = more expensive)
  const fromMonthly = fromPlan.pricing?.monthly || 0;
  const toMonthly = toPlan.pricing?.monthly || 0;
  if (toMonthly <= fromMonthly) {
    throw new Error("Target plan must be more expensive than source plan for an upgrade rule");
  }

  const existing = await PlanUpgradeRule.findOne({ fromPlanId, toPlanId });
  if (existing) throw new Error("An upgrade rule between these plans already exists");

  const rule = await PlanUpgradeRule.create({
    ...payload,
    name: name.trim(),
    fromPlanId,
    toPlanId,
    version: 1,
    createdBy: payload.createdBy,
  });
  return getRule(rule._id);
};

const updateRule = async (id, payload, updatedBy) => {
  const rule = await PlanUpgradeRule.findById(id);
  if (!rule) throw new Error("Upgrade rule not found");

  const { name, description, strategy, requiresApproval, approvedByRole, prorataMode, allowSchedule, minDaysOnPlan, generateInvoiceImmediately, appliesTo, storeIds, status } = payload;

  if (name) rule.name = name.trim();
  if (description !== undefined) rule.description = description;
  if (strategy) rule.strategy = strategy;
  if (requiresApproval !== undefined) rule.requiresApproval = requiresApproval;
  if (approvedByRole) rule.approvedByRole = approvedByRole;
  if (prorataMode) rule.prorataMode = prorataMode;
  if (allowSchedule !== undefined) rule.allowSchedule = allowSchedule;
  if (minDaysOnPlan !== undefined) rule.minDaysOnPlan = minDaysOnPlan;
  if (generateInvoiceImmediately !== undefined) rule.generateInvoiceImmediately = generateInvoiceImmediately;
  if (appliesTo) rule.appliesTo = appliesTo;
  if (storeIds) rule.storeIds = storeIds;
  if (status) rule.status = status;
  rule.updatedBy = updatedBy;
  rule.version = (rule.version || 1) + 1;
  await rule.save();
  return getRule(rule._id);
};

const deleteRule = async (id) => {
  const doc = await PlanUpgradeRule.findByIdAndDelete(id);
  if (!doc) throw new Error("Upgrade rule not found");
  return doc;
};

const updateRuleStatus = async (id, status, updatedBy) => {
  const rule = await PlanUpgradeRule.findById(id);
  if (!rule) throw new Error("Upgrade rule not found");
  rule.status = status;
  rule.updatedBy = updatedBy;
  await rule.save();
  return rule;
};

const cloneRule = async (id, createdBy) => {
  const source = await getRule(id);
  const doc = await PlanUpgradeRule.create({
    name: `${source.name} (Clone)`,
    description: source.description,
    fromPlanId: source.fromPlanId,
    toPlanId: source.toPlanId,
    strategy: source.strategy,
    requiresApproval: source.requiresApproval,
    approvedByRole: source.approvedByRole,
    prorataMode: source.prorataMode,
    allowSchedule: source.allowSchedule,
    minDaysOnPlan: source.minDaysOnPlan,
    generateInvoiceImmediately: source.generateInvoiceImmediately,
    appliesTo: source.appliesTo,
    storeIds: source.storeIds || [],
    status: "draft",
    version: 1,
    createdBy,
  });
  return getRule(doc._id);
};

/* ------------------------- Billing engine ------------------------- */

/**
 * Given a subscription and a target (higher) plan + the active upgrade rule,
 * compute the upgrade billing details.
 */
const computeUpgrade = async ({ subscription, toPlan, rule }) => {
  const now = new Date();
  const periodStart = subscription.currentPeriodStart || subscription.startedAt || now;
  const periodEnd = subscription.currentPeriodEnd || dayjs(periodStart).add(1, "month").toDate();
  const totalMs = Math.max(periodEnd.getTime() - periodStart.getTime(), 1);
  const elapsedMs = Math.max(now.getTime() - periodStart.getTime(), 0);
  const remainingMs = Math.max(totalMs - elapsedMs, 0);
  const remainingRatio = remainingMs / totalMs;

  const currentMonthly = subscription.priceSnapshot?.monthly || subscription.basePriceInCurrency || 0;
  const newMonthly = toPlan.pricing?.monthly || 0;
  const newYearly = toPlan.pricing?.yearly || 0;
  const currentAmountPaid = subscription.priceSnapshot?.monthly || currentMonthly;

  // Used value of current subscription (already paid, partially consumed)
  const usedValue = currentAmountPaid * (1 - remainingRatio);
  // Credit remaining on current subscription
  const creditValue = currentAmountPaid * remainingRatio;
  // New price for the remaining period on the target plan
  const newPriceRemaining = newMonthly * remainingRatio;
  // Amount due now on upgrade (new price for remaining - credit)
  const amountDueNow = Math.max(newPriceRemaining - creditValue, 0);

  let strategy = rule?.strategy || "prorata";
  let effectiveDate = now;
  let amountDue = 0;
  let description = "";

  switch (strategy) {
    case "immediate":
      effectiveDate = now;
      amountDue = newMonthly;
      description = `Immediate upgrade to ${toPlan.name}  full price charged now`;
      break;
    case "next_renewal":
      effectiveDate = periodEnd;
      amountDue = 0;
      description = `Upgrade to ${toPlan.name} scheduled at next renewal (${periodEnd.toISOString()})`;
      break;
    case "manual_approval":
      effectiveDate = now;
      amountDue = amountDueNow;
      description = `Upgrade to ${toPlan.name} pending manual approval`;
      break;
    case "prorata":
    default:
      effectiveDate = now;
      amountDue = amountDueNow;
      description = `Prorated upgrade to ${toPlan.name}  credit ${Math.round(creditValue * 100) / 100}, due ${Math.round(amountDueNow * 100) / 100}`;
      break;
  }

  return {
    ruleId: rule?._id,
    strategy,
    fromPlanId: subscription.planId,
    toPlan: toPlan._id,
    toPlanName: toPlan.name,
    effectiveDate,
    currentDaily: currentMonthly / 30,
    newDaily: newMonthly / 30,
    remainingRatio: Math.round(remainingRatio * 10000) / 10000,
    creditValue: Math.round(creditValue * 100) / 100,
    usedValue: Math.round(usedValue * 100) / 100,
    newPriceRemaining: Math.round(newPriceRemaining * 100) / 100,
    amountDueNow: Math.round(amountDueNow * 100) / 100,
    amountDue: Math.round(amountDue * 100) / 100,
    description,
    requiresApproval: Boolean(rule?.requiresApproval),
  };
};

/**
 * Find the applicable upgrade rule between two plans.
 */
const findRule = async ({ fromPlanId, toPlanId }) => {
  return PlanUpgradeRule.findOne({ fromPlanId, toPlanId, status: "active" });
};

/**
 * Preview an upgrade for a subscription (no write).
 */
const previewUpgrade = async ({ subscriptionId, toPlanId }) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");
  const toPlan = await Plan.findById(toPlanId);
  if (!toPlan) throw new Error("Target plan not found");
  const rule = await findRule({ fromPlanId: subscription.planId, toPlanId });
  return computeUpgrade({ subscription, toPlan, rule });
};

/**
 * Execute an upgrade: apply the strategy and update the subscription.
 */
const executeUpgrade = async ({ subscriptionId, toPlanId, approvedBy, effectiveAt }) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");
  const toPlan = await Plan.findById(toPlanId);
  if (!toPlan) throw new Error("Target plan not found");
  const rule = await findRule({ fromPlanId: subscription.planId, toPlanId });
  if (!rule) throw new Error("No active upgrade rule found between these plans");

  const computation = await computeUpgrade({ subscription, toPlan, rule });

  // If manual approval required and not approved yet
  if (rule.requiresApproval && !approvedBy) {
    return {
      status: "pending_approval",
      ...computation,
      message: "Upgrade requires manual approval",
    };
  }

  const effectiveDate = effectiveAt ? new Date(effectiveAt) : computation.effectiveDate;

  // Next renewal: just schedule (set pendingPlan)
  if (rule.strategy === "next_renewal") {
    subscription.pendingPlan = {
      planId: toPlan._id,
      effectiveFrom: computation.effectiveDate,
      reason: "upgrade",
    };
    await subscription.save();
    return { status: "scheduled", ...computation };
  }

  // Immediate / prorata / manual_approval: switch now
  const previousPlanId = subscription.planId;
  subscription.planId = toPlan._id;
  subscription.currentPlanName = toPlan.name;
  subscription.priceSnapshot = {
    monthly: toPlan.pricing?.monthly,
    yearly: toPlan.pricing?.yearly,
    currency: toPlan.pricing?.currency || subscription.currency,
    taxIncluded: subscription.priceSnapshot?.taxIncluded,
  };
  subscription.currency = toPlan.pricing?.currency || subscription.currency;
  subscription.basePriceInCurrency = toPlan.pricing?.monthly;
  if (rule.strategy === "immediate") {
    // Reset the period
    subscription.currentPeriodStart = effectiveDate;
    subscription.currentPeriodEnd = dayjs(effectiveDate).add(1, "month").toDate();
  }
  subscription.events.push({
    type: "upgraded",
    message: computation.description,
    data: { previousPlanId, newPlanId: toPlan._id, strategy: rule.strategy, amountDue: computation.amountDue },
    actor: approvedBy,
    createdAt: new Date(),
  });
  await subscription.save();

  // Update store
  const store = await Store.findById(subscription.storeId);
  if (store) {
    store.planId = toPlan._id;
    store.planName = toPlan.name;
    store.subscriptionStatus = subscription.status;
    store.currentSubscriptionId = subscription._id;
    await store.save();
  }

  // Generate invoice if required
  if (rule.generateInvoiceImmediately && computation.amountDue > 0) {
    const invoice = await Invoice.create({
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      storeId: subscription.storeId,
      subscriptionId: subscription._id,
      planId: toPlan._id,
      items: [
        {
          description: `Upgrade to ${toPlan.name} (${rule.strategy})`,
          quantity: 1,
          unitPrice: computation.amountDue,
          total: computation.amountDue,
        },
      ],
      baseAmount: computation.amountDue,
      subtotal: computation.amountDue,
      tax: 0,
      total: computation.amountDue,
      currency: toPlan.pricing?.currency || "USD",
      status: "sent",
      dueDate: dayjs(effectiveDate).add(7, "day").toDate(),
      issuedAt: new Date(),
    });
    return { status: "upgraded", ...computation, invoiceId: invoice._id };
  }

  return { status: "upgraded", ...computation };
};

module.exports = {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  updateRuleStatus,
  cloneRule,
  computeUpgrade,
  findRule,
  previewUpgrade,
  executeUpgrade,
};
