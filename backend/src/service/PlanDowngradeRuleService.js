const mongoose = require("mongoose");
const dayjs = require("dayjs");
const Plan = require("../models/Plan");
const Store = require("../models/Store");
const PlanDowngradeRule = require("../models/PlanDowngradeRule");
const Subscription = require("../models/Subscription");
const PlanQuota = require("../models/PlanQuota");
const StoreUsage = require("../models/StoreUsage");

/**
 * PlanDowngradeRuleService (P5)
 *
 * CRUD for downgrade rules + a validation engine that checks whether a
 * subscription can be downgraded to a lower plan based on quota usage,
 * and applies the configured policy (refuse / require_deletion / read_only /
 * grace_period).
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

  const total = await PlanDowngradeRule.countDocuments(query);
  const docs = await PlanDowngradeRule.find(query)
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
  const doc = await PlanDowngradeRule.findById(id)
    .populate("fromPlanId", "name slug pricing")
    .populate("toPlanId", "name slug pricing");
  if (!doc) throw new Error("Downgrade rule not found");
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

  // Validate ordering by price (downgrade = less expensive)
  const fromMonthly = fromPlan.pricing?.monthly || 0;
  const toMonthly = toPlan.pricing?.monthly || 0;
  if (toMonthly >= fromMonthly) {
    throw new Error("Target plan must be cheaper than source plan for a downgrade rule");
  }

  const existing = await PlanDowngradeRule.findOne({ fromPlanId, toPlanId });
  if (existing) throw new Error("A downgrade rule between these plans already exists");

  const rule = await PlanDowngradeRule.create({
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
  const rule = await PlanDowngradeRule.findById(id);
  if (!rule) throw new Error("Downgrade rule not found");

  const { name, description, quotaExceedPolicy, graceDays, requiresApproval, approvedByRole, effectiveStrategy, issueProratedCredit, preserveExcessData, minDaysOnPlan, appliesTo, status } = payload;

  if (name) rule.name = name.trim();
  if (description !== undefined) rule.description = description;
  if (quotaExceedPolicy) rule.quotaExceedPolicy = quotaExceedPolicy;
  if (graceDays !== undefined) rule.graceDays = graceDays;
  if (requiresApproval !== undefined) rule.requiresApproval = requiresApproval;
  if (approvedByRole) rule.approvedByRole = approvedByRole;
  if (effectiveStrategy) rule.effectiveStrategy = effectiveStrategy;
  if (issueProratedCredit !== undefined) rule.issueProratedCredit = issueProratedCredit;
  if (preserveExcessData !== undefined) rule.preserveExcessData = preserveExcessData;
  if (minDaysOnPlan !== undefined) rule.minDaysOnPlan = minDaysOnPlan;
  if (appliesTo) rule.appliesTo = appliesTo;
  if (status) rule.status = status;
  rule.updatedBy = updatedBy;
  rule.version = (rule.version || 1) + 1;
  await rule.save();
  return getRule(rule._id);
};

const deleteRule = async (id) => {
  const doc = await PlanDowngradeRule.findByIdAndDelete(id);
  if (!doc) throw new Error("Downgrade rule not found");
  return doc;
};

const updateRuleStatus = async (id, status, updatedBy) => {
  const rule = await PlanDowngradeRule.findById(id);
  if (!rule) throw new Error("Downgrade rule not found");
  rule.status = status;
  rule.updatedBy = updatedBy;
  await rule.save();
  return rule;
};

const cloneRule = async (id, createdBy) => {
  const source = await getRule(id);
  const doc = await PlanDowngradeRule.create({
    name: `${source.name} (Clone)`,
    description: source.description,
    fromPlanId: source.fromPlanId,
    toPlanId: source.toPlanId,
    quotaExceedPolicy: source.quotaExceedPolicy,
    graceDays: source.graceDays,
    requiresApproval: source.requiresApproval,
    approvedByRole: source.approvedByRole,
    effectiveStrategy: source.effectiveStrategy,
    issueProratedCredit: source.issueProratedCredit,
    preserveExcessData: source.preserveExcessData,
    minDaysOnPlan: source.minDaysOnPlan,
    appliesTo: source.appliesTo,
    status: "draft",
    version: 1,
    createdBy,
  });
  return getRule(doc._id);
};

/* ------------------------- Validation engine ------------------------- */

const findRule = async ({ fromPlanId, toPlanId }) => {
  return PlanDowngradeRule.findOne({ fromPlanId, toPlanId, status: "active" });
};

/**
 * Check the store's actual usage against the target plan's quotas.
 * Returns a list of over-quota items, each with current usage, target limit,
 * and the enforced policy.
 */
const checkQuotaFit = async ({ storeId, toPlanId }) => {
  const quotas = await PlanQuota.find({ planId: toPlanId });
  if (!quotas.length) return { ok: true, overQuota: [] };

  const usages = await StoreUsage.find({ storeId });
  const usageByCode = new Map(usages.map((u) => [u.quotaTypeCode, u.used]));

  const overQuota = [];
  for (const quota of quotas) {
    if (quota.isUnlimited || quota.limitValue == null) continue;
    const used = usageByCode.get(quota.quotaTypeCode) || 0;
    if (used > quota.limitValue) {
      overQuota.push({
        quotaTypeCode: quota.quotaTypeCode,
        quotaTypeId: quota.quotaTypeId,
        current: used,
        limit: quota.limitValue,
        excess: used - quota.limitValue,
      });
    }
  }

  return { ok: overQuota.length === 0, overQuota };
};

/**
 * Validate a downgrade for a subscription against a target plan.
 * Returns a decision object with policy and any over-quota items.
 */
const validateDowngrade = async ({ subscriptionId, toPlanId }) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");
  const toPlan = await Plan.findById(toPlanId);
  if (!toPlan) throw new Error("Target plan not found");

  const rule = await findRule({ fromPlanId: subscription.planId, toPlanId });
  if (!rule) throw new Error("No active downgrade rule found between these plans");

  const { ok, overQuota } = await checkQuotaFit({ storeId: subscription.storeId, toPlanId });

  const policy = overQuota.length ? rule.quotaExceedPolicy : "ok";

  let allowed = true;
  let blockingReason = null;
  let actionRequired = null;

  if (overQuota.length) {
    if (policy === "refuse") {
      allowed = false;
      blockingReason = "Store exceeds target plan quota; downgrade refused until usage is reduced";
      actionRequired = "reduce_usage";
    } else if (policy === "require_deletion") {
      allowed = false;
      blockingReason = "Store exceeds target plan quota; data deletion required before downgrade";
      actionRequired = "delete_data";
    } else if (policy === "read_only") {
      allowed = true;
      actionRequired = "read_only";
    } else if (policy === "grace_period") {
      allowed = true;
      actionRequired = "grace_period";
    }
  }

  // Effective date based on strategy
  const now = new Date();
  let effectiveDate = now;
  if (rule.effectiveStrategy === "next_renewal") {
    effectiveDate = subscription.currentPeriodEnd || dayjs(now).add(1, "month").toDate();
  } else if (rule.effectiveStrategy === "end_of_day") {
    effectiveDate = dayjs(now).endOf("day").toDate();
  }

  return {
    ruleId: rule._id,
    toPlanId: toPlan._id,
    toPlanName: toPlan.name,
    fromPlanId: subscription.planId,
    policy,
    allowed,
    overQuota,
    graceDays: policy === "grace_period" ? rule.graceDays : 0,
    effectiveStrategy: rule.effectiveStrategy,
    effectiveDate,
    requiresApproval: Boolean(rule.requiresApproval),
    blockingReason,
    actionRequired,
    issueProratedCredit: rule.issueProratedCredit,
  };
};

/**
 * Execute a downgrade: apply the policy and update the subscription.
 */
const executeDowngrade = async ({ subscriptionId, toPlanId, approvedBy, effectiveAt }) => {
  const validation = await validateDowngrade({ subscriptionId, toPlanId });
  if (!validation.allowed) {
    throw new Error(validation.blockingReason || "Downgrade not allowed");
  }

  const rule = await getRule(validation.ruleId);
  const subscription = await Subscription.findById(subscriptionId);
  const toPlan = await Plan.findById(toPlanId);

  if (rule.requiresApproval && !approvedBy) {
    return {
      status: "pending_approval",
      ...validation,
      message: "Downgrade requires manual approval",
    };
  }

  const effectiveDate = effectiveAt ? new Date(effectiveAt) : validation.effectiveDate;

  // Next renewal / scheduled: just set pendingPlan
  if (rule.effectiveStrategy === "next_renewal" || rule.effectiveStrategy === "end_of_day") {
    subscription.pendingPlan = {
      planId: toPlan._id,
      effectiveFrom: effectiveDate,
      reason: "downgrade",
    };
    if (validation.overQuota.length && validation.policy === "grace_period") {
      subscription.overQuotaItems = validation.overQuota.map((o) => ({
        quotaTypeId: o.quotaTypeId,
        quotaTypeCode: o.quotaTypeCode,
        current: o.current,
        newLimit: o.limit,
        status: "grace_period",
        graceUntil: dayjs(effectiveDate).add(rule.graceDays, "day").toDate(),
        notifiedAt: new Date(),
      }));
    }
    subscription.events.push({
      type: "downgraded",
      message: `Downgrade to ${toPlan.name} scheduled at ${effectiveDate.toISOString()}`,
      data: { toPlanId: toPlan._id, strategy: rule.effectiveStrategy, policy: validation.policy },
      actor: approvedBy,
      createdAt: new Date(),
    });
    await subscription.save();
    return { status: "scheduled", ...validation };
  }

  // Immediate: switch now
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
  subscription.currentPeriodStart = effectiveDate;
  subscription.currentPeriodEnd = dayjs(effectiveDate).add(1, "month").toDate();

  if (validation.overQuota.length && validation.policy === "read_only") {
    subscription.overQuotaItems = validation.overQuota.map((o) => ({
      quotaTypeId: o.quotaTypeId,
      quotaTypeCode: o.quotaTypeCode,
      current: o.current,
      newLimit: o.limit,
      status: "degraded",
      notifiedAt: new Date(),
    }));
  }

  subscription.events.push({
    type: "downgraded",
    message: `Downgraded to ${toPlan.name}`,
    data: { previousPlanId, newPlanId: toPlan._id, policy: validation.policy },
    actor: approvedBy,
    createdAt: new Date(),
  });
  await subscription.save();

  // Update store
  const store = await Store.findById(subscription.storeId);
  if (store) {
    store.planId = toPlan._id;
    store.planName = toPlan.name;
    store.currentSubscriptionId = subscription._id;
    await store.save();
  }

  return { status: "downgraded", ...validation };
};

module.exports = {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  updateRuleStatus,
  cloneRule,
  findRule,
  checkQuotaFit,
  validateDowngrade,
  executeDowngrade,
};
