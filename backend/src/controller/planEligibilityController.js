const mongoose = require("mongoose");
const PlanEligibilityService = require("../service/PlanEligibilityService");

/* ------------------------- CRUD ------------------------- */

const getPlanEligibilityRules = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status = "", planId = "", sort = "-createdAt" } = req.query;
    const result = await PlanEligibilityService.listRules({ page, limit, search, status, planId, sort });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPlanEligibilityRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid eligibility rule id" });
    }
    const doc = await PlanEligibilityService.getRule(id);
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const createPlanEligibilityRule = async (req, res) => {
  try {
    const doc = await PlanEligibilityService.createRule({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, message: "Eligibility rule created", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updatePlanEligibilityRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid eligibility rule id" });
    }
    const doc = await PlanEligibilityService.updateRule(id, req.body, req.user?._id);
    res.status(200).json({ success: true, message: "Eligibility rule updated", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deletePlanEligibilityRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid eligibility rule id" });
    }
    await PlanEligibilityService.deleteRule(id);
    res.status(200).json({ success: true, message: "Eligibility rule deleted" });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const updatePlanEligibilityRuleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["draft", "active", "inactive", "archived"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid eligibility rule id" });
    }
    const doc = await PlanEligibilityService.updateRuleStatus(id, status, req.user?._id);
    res.status(200).json({ success: true, message: `Eligibility rule status set to ${status}`, data: doc });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const clonePlanEligibilityRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid eligibility rule id" });
    }
    const doc = await PlanEligibilityService.cloneRule(id, req.user?._id);
    res.status(201).json({ success: true, message: "Eligibility rule cloned", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ------------------------- Test / Evaluate ------------------------- */

const testPlanEligibilityRule = async (req, res) => {
  try {
    const { storeId, ruleId } = req.body;
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, message: "Valid storeId is required" });
    }
    const Store = require("../models/Store");
const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }
    const storeUsageMap = await PlanEligibilityService.buildStoreUsageMap(storeId);

    if (ruleId) {
      if (!mongoose.Types.ObjectId.isValid(ruleId)) {
        return res.status(400).json({ success: false, message: "Invalid ruleId" });
      }
      const result = await PlanEligibilityService.evaluateRule(ruleId, store, storeUsageMap);
      return res.status(200).json({ success: true, data: { ...result, storeId } });
    }

    const { planId } = req.body;
    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ success: false, message: "Valid planId is required when ruleId is absent" });
    }
    const result = await PlanEligibilityService.evaluateForStore({ storeId, planId });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const previewPlanEligibilityRule = async (req, res) => {
  try {
    const { storeId, rootGroup, conditions } = req.body;
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, message: "Valid storeId is required" });
    }
    const result = await PlanEligibilityService.previewRule({ storeId, rootGroup, conditions });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ------------------------- Commercial approval ------------------------- */

const approvePlanEligibility = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid eligibility rule id" });
    }
    const rule = await PlanEligibilityService.getRule(id);
    if (!rule) {
      return res.status(404).json({ success: false, message: "Eligibility rule not found" });
    }

    // Record approval in rule (approval metadata)
    const doc = await PlanEligibilityService.updateRule(
      id,
      { approved: true, approvedBy: req.user?._id, approvedAt: new Date() },
      req.user?._id
    );
    res.status(200).json({ success: true, message: "Eligibility approved", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ------------------------- Factors for rule builder ------------------------- */

const getEligibilityFactors = async (req, res) => {
  try {
    const TrialFactor = require("../models/TrialFactor");
    const factors = await TrialFactor.find({ status: "active" }).sort({ category: 1, code: 1 });
    res.status(200).json({ success: true, data: factors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getEligibilityOperators = async (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      { code: "equals", label: "Equals (==)" },
      { code: "notEquals", label: "Not equals (!=)" },
      { code: "greaterThan", label: "Greater than (>)" },
      { code: "lessThan", label: "Less than (<)" },
      { code: "greaterThanOrEqual", label: "Greater than or equal (>=)" },
      { code: "lessThanOrEqual", label: "Less than or equal (<=)" },
      { code: "between", label: "Between" },
      { code: "in", label: "In list" },
      { code: "notIn", label: "Not in list" },
    ],
  });
};

module.exports = {
  getPlanEligibilityRules,
  getPlanEligibilityRule,
  createPlanEligibilityRule,
  updatePlanEligibilityRule,
  deletePlanEligibilityRule,
  updatePlanEligibilityRuleStatus,
  clonePlanEligibilityRule,
  testPlanEligibilityRule,
  previewPlanEligibilityRule,
  approvePlanEligibility,
  getEligibilityFactors,
  getEligibilityOperators,
};
