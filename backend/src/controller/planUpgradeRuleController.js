const mongoose = require("mongoose");
const PlanUpgradeRuleService = require("../service/PlanUpgradeRuleService");

/* ------------------------- CRUD ------------------------- */

const getUpgradeRules = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status = "", fromPlanId = "", toPlanId = "", sort = "-createdAt" } = req.query;
    const result = await PlanUpgradeRuleService.listRules({ page, limit, search, status, fromPlanId, toPlanId, sort });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUpgradeRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid upgrade rule id" });
    }
    const doc = await PlanUpgradeRuleService.getRule(id);
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const createUpgradeRule = async (req, res) => {
  try {
    const doc = await PlanUpgradeRuleService.createRule({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, message: "Upgrade rule created", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateUpgradeRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid upgrade rule id" });
    }
    const doc = await PlanUpgradeRuleService.updateRule(id, req.body, req.user?._id);
    res.status(200).json({ success: true, message: "Upgrade rule updated", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteUpgradeRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid upgrade rule id" });
    }
    await PlanUpgradeRuleService.deleteRule(id);
    res.status(200).json({ success: true, message: "Upgrade rule deleted" });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const updateUpgradeRuleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["draft", "active", "inactive", "archived"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid upgrade rule id" });
    }
    const doc = await PlanUpgradeRuleService.updateRuleStatus(id, status, req.user?._id);
    res.status(200).json({ success: true, message: `Upgrade rule status set to ${status}`, data: doc });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const cloneUpgradeRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid upgrade rule id" });
    }
    const doc = await PlanUpgradeRuleService.cloneRule(id, req.user?._id);
    res.status(201).json({ success: true, message: "Upgrade rule cloned", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ------------------------- Billing engine ------------------------- */

const previewUpgrade = async (req, res) => {
  try {
    const { subscriptionId, toPlanId } = req.body;
    if (!subscriptionId || !toPlanId || !mongoose.Types.ObjectId.isValid(subscriptionId) || !mongoose.Types.ObjectId.isValid(toPlanId)) {
      return res.status(400).json({ success: false, message: "Valid subscriptionId and toPlanId are required" });
    }
    const result = await PlanUpgradeRuleService.previewUpgrade({ subscriptionId, toPlanId });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const executeUpgrade = async (req, res) => {
  try {
    const { subscriptionId, toPlanId, approvedBy, effectiveAt } = req.body;
    if (!subscriptionId || !toPlanId || !mongoose.Types.ObjectId.isValid(subscriptionId) || !mongoose.Types.ObjectId.isValid(toPlanId)) {
      return res.status(400).json({ success: false, message: "Valid subscriptionId and toPlanId are required" });
    }
    const result = await PlanUpgradeRuleService.executeUpgrade({
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
  getUpgradeRules,
  getUpgradeRule,
  createUpgradeRule,
  updateUpgradeRule,
  deleteUpgradeRule,
  updateUpgradeRuleStatus,
  cloneUpgradeRule,
  previewUpgrade,
  executeUpgrade,
};
