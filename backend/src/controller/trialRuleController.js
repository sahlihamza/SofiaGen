const mongoose = require("mongoose");
const TrialRule = require("../models/TrialRule");
const TrialFactor = require("../models/TrialFactor");
const RuleCondition = require("../models/RuleCondition");
const RuleAction = require("../models/RuleAction");
const TrialEngineService = require("../service/TrialEngineService");

/* ------------------------- Rule CRUD ------------------------- */

const getTrialRules = async (req, res) => {
  try {
    const { status = "", search = "", appliesTo = "", sort = "-createdAt" } = req.query;
    const query = {};
    if (status) query.status = status;
    if (appliesTo) query.appliesTo = appliesTo;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sortObject = {};
    const raw = sort;
    const field = raw.replace(/^-/, "");
    sortObject[field] = raw.startsWith("-") ? -1 : 1;

    const rules = await TrialRule.find(query)
      .populate("planIds", "name slug")
      .sort(sortObject);

    // Enrich with condition & action counts
    const ruleIds = rules.map((r) => r._id);
    const condCounts = await RuleCondition.aggregate([
      { $match: { ruleId: { $in: ruleIds } } },
      { $group: { _id: "$ruleId", count: { $sum: 1 } } },
    ]);
    const actionCounts = await RuleAction.aggregate([
      { $match: { ruleId: { $in: ruleIds } } },
      { $group: { _id: "$ruleId", count: { $sum: 1 } } },
    ]);
    const condMap = Object.fromEntries(condCounts.map((c) => [String(c._id), c.count]));
    const actionMap = Object.fromEntries(actionCounts.map((c) => [String(c._id), c.count]));

    const enriched = rules.map((r) => ({
      ...r.toObject(),
      conditionCount: condMap[String(r._id)] || 0,
      actionCount: actionMap[String(r._id)] || 0,
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTrialRuleById = async (req, res) => {
  try {
    const rule = await TrialRule.findById(req.params.id).populate("planIds", "name slug");
    if (!rule) return res.status(404).json({ success: false, message: "Trial rule not found" });

    const conditions = await RuleCondition.find({ ruleId: rule._id }).sort({ order: 1 });
    const actions = await RuleAction.find({ ruleId: rule._id }).sort({ order: 1 });

    res.status(200).json({ success: true, data: { ...rule.toObject(), conditions, actions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createTrialRule = async (req, res) => {
  try {
    const { name, description, appliesTo, planIds, priority, status, rootGroup, conditions, actions } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Rule name is required" });

    const rule = new TrialRule({
      name: name.trim(),
      description,
      appliesTo: appliesTo || "new_stores",
      planIds: planIds || [],
      priority: priority || 100,
      status: status || "draft",
      rootGroup: rootGroup || { logicOperator: "AND", children: [], conditionIds: [] },
      version: 1,
      createdBy: req.user?._id,
    });
    await rule.save();

    // Persist conditions
    const conditionIds = [];
    if (Array.isArray(conditions)) {
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i];
        const cond = await RuleCondition.create({
          ruleId: rule._id,
          groupId: c.groupId || null,
          factorId: c.factorId,
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

    // Persist actions
    if (Array.isArray(actions)) {
      for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        await RuleAction.create({
          ruleId: rule._id,
          actionType: a.actionType,
          label: a.label,
          config: a.config || {},
          order: i,
        });
      }
    }

    res.status(201).json({ success: true, message: "Trial rule created", data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateTrialRule = async (req, res) => {
  try {
    const rule = await TrialRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: "Trial rule not found" });

    const { name, description, appliesTo, planIds, priority, status, rootGroup, conditions, actions } = req.body;

    if (name) rule.name = name.trim();
    if (description !== undefined) rule.description = description;
    if (appliesTo) rule.appliesTo = appliesTo;
    if (planIds) rule.planIds = planIds;
    if (priority !== undefined) rule.priority = priority;
    if (status) rule.status = status;
    if (rootGroup) rule.rootGroup = rootGroup;
    rule.updatedBy = req.user?._id;

    // Replace conditions if provided
    if (Array.isArray(conditions)) {
      await RuleCondition.deleteMany({ ruleId: rule._id });
      const conditionIds = [];
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i];
        const cond = await RuleCondition.create({
          ruleId: rule._id,
          groupId: c.groupId || null,
          factorId: c.factorId,
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

    // Replace actions if provided
    if (Array.isArray(actions)) {
      await RuleAction.deleteMany({ ruleId: rule._id });
      for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        await RuleAction.create({
          ruleId: rule._id,
          actionType: a.actionType,
          label: a.label,
          config: a.config || {},
          order: i,
        });
      }
    }

    rule.version = (rule.version || 1) + 1;
    await rule.save();

    res.status(200).json({ success: true, message: "Trial rule updated", data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteTrialRule = async (req, res) => {
  try {
    const rule = await TrialRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: "Trial rule not found" });

    await RuleCondition.deleteMany({ ruleId: rule._id });
    await RuleAction.deleteMany({ ruleId: rule._id });
    await TrialRule.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: "Trial rule deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateTrialRuleStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["draft", "active", "inactive", "archived"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const rule = await TrialRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: "Trial rule not found" });

    rule.status = status;
    rule.updatedBy = req.user?._id;
    await rule.save();
    res.status(200).json({ success: true, message: `Rule status set to ${status}`, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ------------------------- Rule Builder ------------------------- */

const cloneTrialRule = async (req, res) => {
  try {
    const rule = await TrialRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: "Trial rule not found" });

    const conditions = await RuleCondition.find({ ruleId: rule._id });
    const actions = await RuleAction.find({ ruleId: rule._id });

    const clone = new TrialRule({
      name: `${rule.name} (Clone)`,
      description: rule.description,
      appliesTo: rule.appliesTo,
      planIds: rule.planIds,
      priority: rule.priority,
      rootGroup: rule.rootGroup,
      status: "draft",
      version: 1,
      createdBy: req.user?._id,
    });
    await clone.save();

    const condIds = [];
    for (const c of conditions) {
      const cond = await RuleCondition.create({
        ruleId: clone._id,
        groupId: c.groupId,
        factorId: c.factorId,
        factorCode: c.factorCode,
        field: c.field,
        operator: c.operator,
        value: c.value,
        negate: c.negate,
        order: c.order,
      });
      condIds.push(cond._id);
    }
    clone.conditionIds = condIds;
    await clone.save();

    for (const a of actions) {
      await RuleAction.create({
        ruleId: clone._id,
        actionType: a.actionType,
        label: a.label,
        config: a.config,
        order: a.order,
      });
    }

    res.status(201).json({ success: true, message: "Trial rule cloned", data: clone });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const testTrialRule = async (req, res) => {
  try {
    const { storeId, ruleId } = req.body;
    if (!storeId) return res.status(400).json({ success: false, message: "storeId is required" });

    if (ruleId) {
      const rule = await TrialRule.findById(ruleId);
      if (!rule) return res.status(404).json({ success: false, message: "Rule not found" });

      const conditions = await RuleCondition.find({ ruleId });
      const actions = await RuleAction.find({ ruleId });
      const factors = await TrialFactor.find({ status: "active" });
      const factorMap = new Map(factors.map((f) => [String(f._id), f]));
      const factorCodeMap = new Map(factors.map((f) => [f.code, f]));
      const Store = require("../models/Store");
      const store = await Store.findById(storeId);
      const storeUsageMap = await TrialEngineService.buildStoreUsageMap(storeId);
      const context = { store, storeUsageMap, factorMap, factorCodeMap };

      const evaluatedConditions = [];
      for (const c of conditions) {
        const resC = await TrialEngineService.evaluateCondition(c, context);
        evaluatedConditions.push({ condition: c, ...resC });
      }
      const matched = evaluatedConditions.every((e) => e.result);

      return res.status(200).json({
        success: true,
        data: {
          ruleId,
          matched,
          evaluatedConditions,
          actions,
        },
      });
    }

    // Evaluate all active rules for the store
    const matched = await TrialEngineService.evaluateStore(storeId, { verbose: true });
    res.status(200).json({ success: true, data: matched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const previewTrialRule = async (req, res) => {
  try {
    const { storeId, rootGroup, conditions, actions } = req.body;
    if (!storeId) return res.status(400).json({ success: false, message: "storeId is required" });

    const Store = require("../models/Store");
    const store = await Store.findById(storeId);
    const storeUsageMap = await TrialEngineService.buildStoreUsageMap(storeId);
    const factors = await TrialFactor.find({ status: "active" });
    const factorMap = new Map(factors.map((f) => [String(f._id), f]));
    const factorCodeMap = new Map(factors.map((f) => [f.code, f]));
    const context = { store, storeUsageMap, factorMap, factorCodeMap };

    // Build a temp rule object to preview
    const groupResult = await TrialEngineService.evaluateGroup(
      rootGroup || { logicOperator: "AND", children: [], conditionIds: [] },
      context
    );

    let evaluatedConditions = [];
    if (Array.isArray(conditions)) {
      evaluatedConditions = [];
      for (const c of conditions) {
        const cond = new RuleCondition({
          ruleId: new mongoose.Types.ObjectId(),
          groupId: c.groupId || null,
          factorId: c.factorId,
          factorCode: c.factorCode,
          field: c.field,
          operator: c.operator,
          value: c.value,
          negate: Boolean(c.negate),
        });
        const resC = await TrialEngineService.evaluateCondition(cond, context);
        evaluatedConditions.push({ condition: c, ...resC });
      }
    }

    res.status(200).json({
      success: true,
      data: { matched: groupResult.result, evaluatedConditions, actions: actions || [] },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTrialActionTypes = async (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      { code: "end_trial", label: "End Trial", description: "Terminates the trial immediately" },
      { code: "suspend_store", label: "Suspend Store", description: "Suspends the storefront" },
      { code: "read_only", label: "Read Only", description: "Sets the store to read-only mode" },
      { code: "create_invoice", label: "Create Invoice", description: "Generates an invoice" },
      { code: "notify", label: "Notify", description: "Sends a notification (email/sms/in-app)" },
      { code: "webhook", label: "Webhook", description: "Calls an external webhook" },
      { code: "grace_period", label: "Grace Period", description: "Adds a grace period" },
      { code: "downgrade", label: "Downgrade", description: "Downgrades the store plan" },
      { code: "archive", label: "Archive", description: "Archives the store" },
      { code: "custom_action", label: "Custom Action", description: "Runs a custom action" },
    ],
  });
};

module.exports = {
  getTrialRules,
  getTrialRuleById,
  createTrialRule,
  updateTrialRule,
  deleteTrialRule,
  updateTrialRuleStatus,
  cloneTrialRule,
  testTrialRule,
  previewTrialRule,
  getTrialActionTypes,
};
