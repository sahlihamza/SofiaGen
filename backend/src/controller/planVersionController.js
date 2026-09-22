const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const PlanVersion = require("../models/PlanVersion");
const PlanVersionService = require("../service/PlanVersionService");

const getPlanVersions = async (req, res) => {
  try {
    const { planId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ success: false, message: "Invalid planId" });
    }
    const result = await PlanVersionService.listVersions(planId, { page, limit });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPlanVersion = async (req, res) => {
  try {
    const { planId, version } = req.params;
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ success: false, message: "Invalid planId" });
    }
    const doc = await PlanVersionService.getVersion({ planId, version: Number(version) });
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createPlanVersion = async (req, res) => {
  try {
    const { planId } = req.params;
    const { version, versionNote, changeDescription, source } = req.body;

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ success: false, message: "Invalid planId" });
    }
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    const doc = await PlanVersionService.createSnapshot(plan, {
      version,
      versionNote,
      changeDescription,
      source,
      createdBy: req.user?._id,
      ipAddress: req.headers["x-forwarded-for"] || req.ip,
    });

    res.status(201).json({ success: true, message: "Plan version snapshot created", data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const rollbackPlanVersion = async (req, res) => {
  try {
    const { planId, version } = req.params;
    const { versionNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ success: false, message: "Invalid planId" });
    }

    const result = await PlanVersionService.rollback({
      planId,
      version: Number(version),
      createdBy: req.user?._id,
      ipAddress: req.headers["x-forwarded-for"] || req.ip,
      versionNote,
    });

    res.status(200).json({
      success: true,
      message: `Plan rolled back to version ${version}`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deletePlanVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await PlanVersion.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ success: false, message: "Plan version not found" });
    res.status(200).json({ success: true, message: "Plan version deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getPlanVersions,
  getPlanVersion,
  createPlanVersion,
  rollbackPlanVersion,
  deletePlanVersion,
};
