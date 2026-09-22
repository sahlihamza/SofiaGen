const mongoose = require("mongoose");
const PlanTemplateService = require("../service/PlanTemplateService");

const getPlanTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status = "" } = req.query;
    const result = await PlanTemplateService.listTemplates({ page, limit, search, status });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPlanTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid template id" });
    }
    const doc = await PlanTemplateService.getTemplate(id);
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const createPlanTemplate = async (req, res) => {
  try {
    const doc = await PlanTemplateService.createTemplate(req.body, req.user?._id);
    res.status(201).json({ success: true, message: "Plan template created", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updatePlanTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid template id" });
    }
    const doc = await PlanTemplateService.updateTemplate(id, req.body, req.user?._id);
    res.status(200).json({ success: true, message: "Plan template updated", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deletePlanTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid template id" });
    }
    await PlanTemplateService.deleteTemplate(id);
    res.status(200).json({ success: true, message: "Plan template deleted" });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const clonePlanTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid template id" });
    }
    const doc = await PlanTemplateService.cloneTemplate(id, req.body, req.user?._id);
    res.status(201).json({ success: true, message: "Plan template cloned", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const instantiatePlanTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid template id" });
    }
    const { name, slug } = req.body;
    const plan = await PlanTemplateService.instantiate({
      templateId: id,
      name,
      slug,
      createdBy: req.user?._id,
      ipAddress: req.headers["x-forwarded-for"] || req.ip,
    });
    res.status(201).json({
      success: true,
      message: "Plan instantiated from template",
      data: plan,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getPlanTemplates,
  getPlanTemplate,
  createPlanTemplate,
  updatePlanTemplate,
  deletePlanTemplate,
  clonePlanTemplate,
  instantiatePlanTemplate,
};
