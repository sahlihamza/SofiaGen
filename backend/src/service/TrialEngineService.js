const mongoose = require("mongoose");
const dayjs = require("dayjs");
const Store = require("../models/Store");
const TrialRule = require("../models/TrialRule");
const TrialFactor = require("../models/TrialFactor");
const RuleCondition = require("../models/RuleCondition");
const RuleAction = require("../models/RuleAction");

/**
 * TrialEngineService
 *
 * Replaces the hard-coded `trialDays` logic with a dynamic, rule-based engine.
 *
 * A TrialRule contains a tree of RuleConditions grouped by AND/OR/NOT (RuleGroups).
 * When the tree evaluates to `true`, the rule's RuleActions are collected.
 *
 * Example no-code configuration (Super Admin):
 *   - group A (OR):
 *       time_days >= 14
 *       orders >= 100
 *       products >= 100
 *       revenue >= 500
 *       api_calls >= 1000
 *   => end_trial + notify actions
 */

const OPERATORS = {
  equals: (a, b) => String(a) === String(b),
  notEquals: (a, b) => String(a) !== String(b),
  greaterThan: (a, b) => Number(a) > Number(b),
  lessThan: (a, b) => Number(a) < Number(b),
  greaterThanOrEqual: (a, b) => Number(a) >= Number(b),
  lessThanOrEqual: (a, b) => Number(a) <= Number(b),
  between: (a, [min, max]) => Number(a) >= Number(min) && Number(a) <= Number(max),
  in: (a, arr) => (Array.isArray(arr) ? arr.map(String).includes(String(a)) : false),
  notIn: (a, arr) => !(Array.isArray(arr) ? arr.map(String).includes(String(a)) : true),
};

/**
 * Resolve a store's runtime value for a given factor.
 * Fallbacks use the store document itself + StoreUsage counters.
 */
const resolveFactorValue = async ({ factor, store, storeUsageMap }) => {
  const code = factor.code;
  const storeAsMap = store.toObject ? store.toObject() : store;

  switch (code) {
    // TIME
    case "days":
      return store.trialStartDate
        ? dayjs().diff(dayjs(store.trialStartDate), "day")
        : store.createdAt
        ? dayjs().diff(dayjs(store.createdAt), "day")
        : 0;
    case "hours":
      return store.trialStartDate
        ? dayjs().diff(dayjs(store.trialStartDate), "hour")
        : store.createdAt
        ? dayjs().diff(dayjs(store.createdAt), "hour")
        : 0;

    // CATALOG
    case "products":
      return storeUsageMap.get("products") ?? 0;
    case "categories":
      return storeUsageMap.get("categories") ?? 0;
    case "brands":
      return storeUsageMap.get("brands") ?? 0;
    case "variants":
      return storeUsageMap.get("variants") ?? 0;

    // BUSINESS
    case "orders":
      return storeUsageMap.get("orders") ?? 0;
    case "revenue":
      return storeUsageMap.get("revenue") ?? 0;
    case "customers":
      return storeUsageMap.get("customers") ?? 0;

    // API
    case "api_calls":
      return storeUsageMap.get("api_calls") ?? 0;

    // STORAGE
    case "storage":
      return storeUsageMap.get("storage") ?? 0;
    case "images":
      return storeUsageMap.get("images") ?? 0;

    // MARKETING
    case "emails":
      return storeUsageMap.get("emails") ?? 0;
    case "coupons":
      return storeUsageMap.get("coupons") ?? 0;

    // AI
    case "ai_credits":
      return storeUsageMap.get("ai_credits") ?? 0;

    // Fallback: read direct store field or quotaUsage map
    default: {
      if (storeAsMap[code] !== undefined) return storeAsMap[code];
      if (storeAsMap.quotaUsage && storeAsMap.quotaUsage.get) {
        const v = storeAsMap.quotaUsage.get(code);
        if (v !== undefined) return v;
      }
      if (storeAsMap.quotaUsage && storeAsMap.quotaUsage[code]) {
        return storeAsMap.quotaUsage[code];
      }
      return storeUsageMap.get(code) ?? 0;
    }
  }
};

/** Evaluate a single condition. */
const evaluateCondition = async (condition, context) => {
  let factor = condition.factorId
    ? context.factorMap.get(String(condition.factorId))
    : null;
  if (!factor && condition.factorCode) {
    factor = context.factorCodeMap.get(condition.factorCode) || null;
  }
  if (!factor) {
    factor = {
      code: condition.factorCode,
      unit: "number",
      isTimeFactor: false,
    };
  }

  let actual;
  try {
    actual = await resolveFactorValue({ factor, store: context.store, storeUsageMap: context.storeUsageMap });
  } catch (err) {
    actual = 0;
  }

  const op = OPERATORS[condition.operator] || OPERATORS.equals;
  let result = op(actual, condition.value);
  if (condition.negate) result = !result;
  return { result, actual, expected: condition.value, factorCode: factor.code };
};

/** Evaluate a group tree (AND/OR/NOT nested). */
const evaluateGroup = async (group, context) => {
  if (!group) return { result: true, details: [] };

  const branchResults = [];

  // Evaluate child groups recursively
  for (const child of group.children || []) {
    if (child && child.logicOperator) {
      const res = await evaluateGroup(child, context);
      branchResults.push(res.result);
    } else if (child && child.conditionId) {
      // Mixed child stored as a condition reference
      const condition = await RuleCondition.findById(child.conditionId);
      if (condition) {
        const res = await evaluateCondition(condition, context);
        branchResults.push(res.result);
      }
    }
  }

  // Evaluate conditionIds
  if (group.conditionIds && group.conditionIds.length > 0) {
    const conditions = await RuleCondition.find({ _id: { $in: group.conditionIds } }).sort({ order: 1 });
    for (const condition of conditions) {
      const res = await evaluateCondition(condition, context);
      branchResults.push(res.result);
    }
  }

  if (branchResults.length === 0) return { result: true, details: [] };

  const op = group.logicOperator || "AND";
  let result;
  if (op === "AND") {
    result = branchResults.every(Boolean);
  } else if (op === "OR") {
    result = branchResults.some(Boolean);
  } else if (op === "NOT") {
    // NOT applies to the single child (if multiple, flip the AND of all)
    result = !branchResults.every(Boolean);
  } else {
    result = branchResults.every(Boolean);
  }

  return { result, details: branchResults };
};

const buildStoreUsageMap = async (storeId) => {
  const StoreUsage = require("../models/StoreUsage");
  const docs = await StoreUsage.find({ storeId }).populate("quotaTypeId", "code");
  const map = new Map();
  for (const doc of docs) {
    const code = doc.quotaTypeId?.code || doc.quotaTypeCode;
    if (code) map.set(code, doc.used || 0);
  }
  return map;
};

/**
 * Evaluate all active trial rules for a store.
 * Returns matched rules + their actions to execute.
 */
const evaluateStore = async (storeId, options = {}) => {
  const store = await Store.findById(storeId);
  if (!store) {
    throw new Error(`Store ${storeId} not found`);
  }

  const storeUsageMap = await buildStoreUsageMap(storeId);

  const rules = await TrialRule.find({
    status: "active",
    $or: [
      { appliesTo: "all", priority: { $gte: 0 } },
      { appliesTo: "new_stores", priority: { $gte: 0 } },
      { appliesTo: "specific_plans", planIds: store.planId || { $exists: true } },
    ],
  }).sort({ priority: 1, createdAt: -1 });

  const factors = await TrialFactor.find({ status: "active" });
  const factorMap = new Map(factors.map((f) => [String(f._id), f]));
  const factorCodeMap = new Map(factors.map((f) => [f.code, f]));

  const context = { store, storeUsageMap, factorMap, factorCodeMap };

  const matched = [];
  for (const rule of rules) {
    const groupResult = await evaluateGroup(rule.rootGroup || { logicOperator: "ALL", children: [] }, context);
    if (groupResult.result) {
      const actions = await RuleAction.find({ ruleId: rule._id }).sort({ order: 1 });
      matched.push({
        ruleId: rule._id,
        ruleName: rule.name,
        priority: rule.priority,
        actions: actions.map((a) => a.toObject()),
        details: groupResult.details,
      });
    }
  }

  if (options.verbose) {
    return { storeId, matched, evaluatedRules: rules.length, usage: Object.fromEntries(storeUsageMap) };
  }

  return matched;
};

/**
 * Compute the effective trial end date for a store based on the matched rule(s).
 * Prefers the time-based factor (days/hours) of the first matched rule, else returns null.
 */
const hasStoreUsedTrial = async (storeId) => {
  const Subscription = require("../models/Subscription");
  const used = await Subscription.exists({
    storeId,
    $or: [
      { trialEndsAt: { $ne: null } },
      { trialStartDate: { $ne: null } },
      { trialPeriod: true },
      { status: { $in: ["trialing", "trial"] } },
    ],
  });
  return Boolean(used);
};

const computeTrialEndDate = async (storeId, { ignoreHistory = false } = {}) => {
  const store = await Store.findById(storeId);
  if (!store) return null;

  if (!ignoreHistory && (await hasStoreUsedTrial(storeId))) {
    return null;
  }

  const matched = await evaluateStore(storeId);
  if (!matched || matched.length === 0) {
    // Fallback: no rule matched => no trial (or use store fallback)
    return null;
  }

  // Inspect first rule's conditions to find time factor
  const topRule = matched[0];
  const conditions = await RuleCondition.find({ ruleId: topRule.ruleId });
  const timeCondition = conditions.find((c) => c.factorCode === "days" || c.factorCode === "hours");
  if (!timeCondition) return null;

  const { value, operator, factorCode } = timeCondition;
  const base = store.trialStartDate || store.createdAt || new Date();
  if (operator === "greaterThan" || operator === "greaterThanOrEqual") {
    const amount = Number(value);
    return factorCode === "hours"
      ? dayjs(base).add(amount, "hour").toDate()
      : dayjs(base).add(amount, "day").toDate();
  }

  return null;
};

module.exports = {
  OPERATORS,
  resolveFactorValue,
  evaluateCondition,
  evaluateGroup,
  evaluateStore,
  computeTrialEndDate,
  hasStoreUsedTrial,
  buildStoreUsageMap,
};
