const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const Store = require("../models/Store");
const PlanEligibilityRule = require("../models/PlanEligibilityRule");
const RuleCondition = require("../models/RuleCondition");
const TrialFactor = require("../models/TrialFactor");
const TrialEngineService = require("./TrialEngineService");

/**
 * PlanEligibilityService (P16)
 *
 * Determines whether a Store is eligible to subscribe / upgrade to a given
 * Plan, based on a set of no-code eligibility rules (AND/OR/NOT groups).
 *
 * Reuses the TrialEngine evaluation primitives (OPERATORS, evaluateCondition,
 * evaluateGroup, buildStoreUsageMap) to avoid duplicating the rule engine.
 */

/* ------------------------- CRUD ------------------------- */

const listRules = async ({ page = 1, limit = 20, search = "", status = "", planId = "", sort = "-createdAt" } = {}) => {
  const skip = (page - 1) * limit;
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  if (status) query.status = status;
  if (planId && mongoose.Types.ObjectId.isValid(planId)) query.planId = planId;

  const sortObject = {};
  const raw = sort;
  const field = raw.replace(/^-/, "");
  sortObject[field] = raw.startsWith("-") ? -1 : 1;

  const total = await PlanEligibilityRule.countDocuments(query);
  const docs = await PlanEligibilityRule.find(query)
    .populate("planId", "name slug")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort(sortObject)
    .skip(skip)
    .limit(parseInt(limit, 10));

  // Enrich with condition counts
  const ruleIds = docs.map((r) => r._id);
  const condCounts = await RuleCondition.aggregate([
    { $match: { ruleId: { $in: ruleIds } } },
    { $group: { _id: "$ruleId", count: { $sum: 1 } } },
  ]);
  const condMap = Object.fromEntries(condCounts.map((c) => [String(c._id), c.count]));

  const enriched = docs.map((r) => ({
    ...r.toObject(),
    conditionCount: condMap[String(r._id)] || 0,
  }));

  return {
    data: enriched,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / limit),
    },
  };
};

const getRule = async (id) => {
  const doc = await PlanEligibilityRule.findById(id)
    .populate("planId", "name slug")
    .populate("storeIds", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");
  if (!doc) throw new Error("Eligibility rule not found");

  const conditions = await RuleCondition.find({ ruleId: doc._id }).sort({ order: 1 });
  return { ...doc.toObject(), conditions };
};

const createRule = async ({ name, description, planId, appliesTo, storeIds, priority, rootGroup, conditions, requiresCommercialApproval, commercialApprovalRule, allowedApproverRoles, status, createdBy }) => {
  if (!name || !planId) throw new Error("Name and planId are required");
  if (!mongoose.Types.ObjectId.isValid(planId)) throw new Error("Invalid planId");

  const plan = await Plan.findById(planId);
  if (!plan) throw new Error("Plan not found");

  const rule = await PlanEligibilityRule.create({
    name: name.trim(),
    description,
    planId,
    appliesTo: appliesTo || "new_stores",
    storeIds: storeIds || [],
    priority: priority || 100,
    rootGroup: rootGroup || { logicOperator: "AND", children: [], conditionIds: [] },
    requiresCommercialApproval: Boolean(requiresCommercialApproval),
    commercialApprovalRule: commercialApprovalRule || "any",
    allowedApproverRoles: allowedApproverRoles || [],
    status: status || "draft",
    version: 1,
    createdBy,
  });

  // Persist conditions (reuse RuleCondition model)
  const conditionIds = [];
  if (Array.isArray(conditions)) {
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      const cond = await RuleCondition.create({
        ruleId: rule._id,
        groupId: c.groupId || null,
        factorId: c.factorId || null,
        factorCode: c.factorCode,
        field: c.field,
        operator: c.operator,
        value: c.value,
        negate: Boolean(c.negate),
        order: i,
      });
      conditionIds.push(cond._id);
    }
  }
  rule.conditionIds = conditionIds;
  if (rootGroup && Array.isArray(rootGroup.conditionIds)) {
    rule.rootGroup.conditionIds = rootGroup.conditionIds;
  }
  await rule.save();

  return getRule(rule._id);
};

const updateRule = async (id, payload, updatedBy) => {
  const rule = await PlanEligibilityRule.findById(id);
  if (!rule) throw new Error("Eligibility rule not found");

const { name, description, planId, appliesTo, storeIds, priority, rootGroup, conditions, requiresCommercialApproval, commercialApprovalRule, allowedApproverRoles, status, approved, approvedBy, approvedAt, approvalNote } = payload;

  if (name) rule.name = name.trim();
  if (description !== undefined) rule.description = description;
  if (planId) {
    if (!mongoose.Types.ObjectId.isValid(planId)) throw new Error("Invalid planId");
    rule.planId = planId;
  }
  if (appliesTo) rule.appliesTo = appliesTo;
  if (storeIds) rule.storeIds = storeIds;
  if (priority !== undefined) rule.priority = priority;
  if (rootGroup) rule.rootGroup = rootGroup;
  if (requiresCommercialApproval !== undefined) rule.requiresCommercialApproval = requiresCommercialApproval;
  if (commercialApprovalRule) rule.commercialApprovalRule = commercialApprovalRule;
  if (allowedApproverRoles) rule.allowedApproverRoles = allowedApproverRoles;
  if (status) rule.status = status;
  if (approved !== undefined) rule.approved = approved;
  if (approvedBy !== undefined) rule.approvedBy = approvedBy;
  if (approvedAt !== undefined) rule.approvedAt = approvedAt;
  if (approvalNote !== undefined) rule.approvalNote = approvalNote;
  rule.updatedBy = updatedBy;

  // Replace conditions if provided
  if (Array.isArray(conditions)) {
    await RuleCondition.deleteMany({ ruleId: rule._id });
    const conditionIds = [];
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      const cond = await RuleCondition.create({
        ruleId: rule._id,
        groupId: c.groupId || null,
        factorId: c.factorId || null,
        factorCode: c.factorCode,
        field: c.field,
        operator: c.operator,
        value: c.value,
        negate: Boolean(c.negate),
        order: i,
      });
      conditionIds.push(cond._id);
    }
    rule.conditionIds = conditionIds;
  }

  rule.version = (rule.version || 1) + 1;
  await rule.save();

  return getRule(rule._id);
};

const deleteRule = async (id) => {
  const doc = await PlanEligibilityRule.findByIdAndDelete(id);
  if (!doc) throw new Error("Eligibility rule not found");
  await RuleCondition.deleteMany({ ruleId: id });
  return doc;
};

const updateRuleStatus = async (id, status, updatedBy) => {
  const rule = await PlanEligibilityRule.findById(id);
  if (!rule) throw new Error("Eligibility rule not found");
  rule.status = status;
  rule.updatedBy = updatedBy;
  await rule.save();
  return rule;
};

const cloneRule = async (id, createdBy) => {
  const source = await getRule(id);
  const doc = await PlanEligibilityRule.create({
    name: `${source.name} (Clone)`,
    description: source.description,
    planId: source.planId,
    appliesTo: source.appliesTo,
    storeIds: source.storeIds || [],
    priority: source.priority,
    rootGroup: source.rootGroup,
    requiresCommercialApproval: source.requiresCommercialApproval,
    commercialApprovalRule: source.commercialApprovalRule,
    allowedApproverRoles: source.allowedApproverRoles || [],
    status: "draft",
    version: 1,
    createdBy,
  });

  const conditionIds = [];
  for (const c of source.conditions || []) {
    const cond = await RuleCondition.create({
      ruleId: doc._id,
      groupId: c.groupId || null,
      factorId: c.factorId || null,
      factorCode: c.factorCode,
      field: c.field,
      operator: c.operator,
      value: c.value,
      negate: Boolean(c.negate),
      order: c.order,
    });
    conditionIds.push(cond._id);
  }
  doc.conditionIds = conditionIds;
  await doc.save();
  return getRule(doc._id);
};

/* ------------------------- Evaluation ------------------------- */

/**
 * Evaluate a single eligibility rule against a store.
 * Returns { eligible, matched, unmetConditions, evaluatedConditions, requiresApproval }.
 */
const evaluateRule = async (ruleId, store, storeUsageMap) => {
  const rule = await PlanEligibilityRule.findById(ruleId);
  if (!rule) throw new Error("Eligibility rule not found");

  const conditions = await RuleCondition.find({ ruleId }).sort({ order: 1 });
  const factors = await TrialFactor.find({ status: "active" });
  const factorMap = new Map(factors.map((f) => [String(f._id), f]));
  const factorCodeMap = new Map(factors.map((f) => [f.code, f]));

  const context = { store, storeUsageMap, factorMap, factorCodeMap };

  const groupResult = await TrialEngineService.evaluateGroup(
    rule.rootGroup || { logicOperator: "AND", children: [], conditionIds: [] },
    context
  );

  const evaluatedConditions = [];
  for (const c of conditions) {
    const res = await TrialEngineService.evaluateCondition(c, context);
    evaluatedConditions.push({ condition: c, ...res });
  }

  const eligible = groupResult.result;

  return {
    ruleId: rule._id,
    ruleName: rule.name,
    eligible,
    matched: eligible,
    requiresCommercialApproval: rule.requiresCommercialApproval,
    commercialApprovalRule: rule.commercialApprovalRule,
    allowedApproverRoles: rule.allowedApproverRoles,
    evaluatedConditions,
    unmetConditions: evaluatedConditions.filter((e) => !e.result),
    details: groupResult.details,
  };
};

/**
 * Evaluate all active eligibility rules for a given plan + store.
 * A store is eligible if it satisfies ANY active rule for the plan.
 */
const evaluateForStore = async ({ storeId, planId }) => {
  const store = await Store.findById(storeId);
  if (!store) throw new Error(`Store ${storeId} not found`);

  const plan = await Plan.findById(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  // Public plans are always eligible unless an explicit rule exists
  const rules = await PlanEligibilityRule.find({
    planId,
    status: "active",
  }).sort({ priority: 1, createdAt: -1 });

  if (rules.length === 0) {
    return {
      storeId,
      planId,
      planName: plan.name,
      eligible: true,
      matchedRules: [],
      requiresApproval: false,
      reason: "No eligibility rules defined for this plan",
    };
  }

  const storeUsageMap = await TrialEngineService.buildStoreUsageMap(storeId);

  const matchedRules = [];
  const unmetRules = [];
  for (const rule of rules) {
    const result = await evaluateRule(rule._id, store, storeUsageMap);
    if (result.eligible) matchedRules.push(result);
    else unmetRules.push(result);
  }

  const eligible = matchedRules.length > 0;
  const requiresApproval = eligible && matchedRules.some((r) => r.requiresCommercialApproval);

  return {
    storeId,
    planId,
    planName: plan.name,
    eligible,
    requiresApproval,
    matchedRules,
    unmetRules,
    evaluatedRules: rules.length,
  };
};

const assertEligible = async (storeId, planId, { context = "subscribe" } = {}) => {
  const result = await evaluateForStore({ storeId, planId });

  if (!result.eligible) {
    const firstUnmet = (result.unmetRules || [])[0];
    const err = new Error(
      firstUnmet?.failureMessage ||
        firstUnmet?.reason ||
        `Ce store n'est pas éligible au plan "${result.planName}"`
    );
    err.status = 409;
    err.code = "NOT_ELIGIBLE";
    err.context = context;
    err.planId = planId;
    err.storeId = storeId;
    err.ruleId = firstUnmet?.ruleId || null;
    err.unmetRules = result.unmetRules || [];
    throw err;
  }

  return result;
};

/* ------------------------- Preview ------------------------- */

/**
 * Preview an unsaved rule (rule builder "Test Rule" button) against a store.
 */
const previewRule = async ({ storeId, rootGroup, conditions }) => {
  const store = await Store.findById(storeId);
  if (!store) throw new Error(`Store ${storeId} not found`);

  const storeUsageMap = await TrialEngineService.buildStoreUsageMap(storeId);
  const factors = await TrialFactor.find({ status: "active" });
  const factorMap = new Map(factors.map((f) => [String(f._id), f]));
  const factorCodeMap = new Map(factors.map((f) => [f.code, f]));

  const context = { store, storeUsageMap, factorMap, factorCodeMap };

  const groupResult = await TrialEngineService.evaluateGroup(
    rootGroup || { logicOperator: "AND", children: [], conditionIds: [] },
    context
  );

  const evaluatedConditions = [];
  if (Array.isArray(conditions)) {
    for (const c of conditions) {
      const cond = new RuleCondition({
        ruleId: new mongoose.Types.ObjectId(),
        groupId: c.groupId || null,
        factorId: c.factorId || null,
        factorCode: c.factorCode,
        field: c.field,
        operator: c.operator,
        value: c.value,
        negate: Boolean(c.negate),
      });
      const res = await TrialEngineService.evaluateCondition(cond, context);
      evaluatedConditions.push({ condition: c, ...res });
    }
  }

  return {
    matched: groupResult.result,
    evaluatedConditions,
    details: groupResult.details,
  };
};

module.exports = {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  updateRuleStatus,
  cloneRule,
  evaluateRule,
  evaluateForStore,
  assertEligible,
  previewRule,
  buildStoreUsageMap: TrialEngineService.buildStoreUsageMap,
};
