const mongoose = require("mongoose");
const PlanDowngradeRuleService = require("../service/PlanDowngradeRuleService");

/* ------------------------- CRUD ------------------------- */

const getDowngradeRules = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status = "", fromPlanId = "", toPlanId = "", sort = "-createdAt" } = req.query;
    const result = await PlanDowngradeRuleService.listRules({ page, limit, search, status, fromPlanId, toPlanId, sort });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDowngradeRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid downgrade rule id" });
    }
    const doc = await PlanDowngradeRuleService.getRule(id);
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const createDowngradeRule = async (req, res) => {
  try {
    const doc = await PlanDowngradeRuleService.createRule({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, message: "Downgrade rule created", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateDowngradeRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid downgrade rule id" });
    }
    const doc = await PlanDowngradeRuleService.updateRule(id, req.body, req.user?._id);
    res.status(200).json({ success: true, message: "Downgrade rule updated", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteDowngradeRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid downgrade rule id" });
    }
    await PlanDowngradeRuleService.deleteRule(id);
    res.status(200).json({ success: true, message: "Downgrade rule deleted" });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const updateDowngradeRuleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["draft", "active", "inactive", "archived"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid downgrade rule id" });
    }
    const doc = await PlanDowngradeRuleService.updateRuleStatus(id, status, req.user?._id);
    res.status(200).json({ success: true, message: `Downgrade rule status set to ${status}`, data: doc });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const cloneDowngradeRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid downgrade rule id" });
    }
    const doc = await PlanDowngradeRuleService.cloneRule(id, req.user?._id);
    res.status(201).json({ success: true, message: "Downgrade rule cloned", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ------------------------- Validation engine ------------------------- */

const validateDowngrade = async (req, res) => {
  try {
    const { subscriptionId, toPlanId } = req.body;
    if (!subscriptionId || !toPlanId || !mongoose.Types.ObjectId.isValid(subscriptionId) || !mongoose.Types.ObjectId.isValid(toPlanId)) {
      return res.status(400).json({ success: false, message: "Valid subscriptionId and toPlanId are required" });
    }
    const result = await PlanDowngradeRuleService.validateDowngrade({ subscriptionId, toPlanId });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const executeDowngrade = async (req, res) => {
  try {
    const { subscriptionId, toPlanId, approvedBy, effectiveAt } = req.body;
    if (!subscriptionId || !toPlanId || !mongoose.Types.ObjectId.isValid(subscriptionId) || !mongoose.Types.ObjectId.isValid(toPlanId)) {
      return res.status(400).json({ success: false, message: "Valid subscriptionId and toPlanId are required" });
    }
    const result = await PlanDowngradeRuleService.executeDowngrade({
      subscriptionId,
      toPlanId,
      approvedBy: approvedBy || req.user?._id,
      effectiveAt,
    });
    const statusCode = result.status === "pending_approval" ? 202 : 200;
    res.status(statusCode).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDowngradeRules,
  getDowngradeRule,
  createDowngradeRule,
  updateDowngradeRule,
  deleteDowngradeRule,
  updateDowngradeRuleStatus,
  cloneDowngradeRule,
  validateDowngrade,
  executeDowngrade,
};
