const mongoose = require("mongoose");
const OverageService = require("../service/OverageService");

const getOverages = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status = "", quotaTypeCode = "", planId = "", sort = "-createdAt" } = req.query;
    const result = await OverageService.listOverages({ page, limit, search, status, quotaTypeCode, planId, sort });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOverage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid overage id" });
    }
    const doc = await OverageService.getOverage(id);
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const createOverage = async (req, res) => {
  try {
    const doc = await OverageService.createOverage({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, message: "Overage rule created", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateOverage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid overage id" });
    }
    const doc = await OverageService.updateOverage(id, req.body, req.user?._id);
    res.status(200).json({ success: true, message: "Overage rule updated", data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteOverage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid overage id" });
    }
    await OverageService.deleteOverage(id);
    res.status(200).json({ success: true, message: "Overage rule deleted" });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const updateOverageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["draft", "active", "inactive", "archived"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid overage id" });
    }
    const doc = await OverageService.updateOverageStatus(id, status, req.user?._id);
    res.status(200).json({ success: true, message: `Overage rule status set to ${status}`, data: doc });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const calculateOverage = async (req, res) => {
  try {
    const { subscriptionId, periodStart, periodEnd } = req.body;
    if (!subscriptionId || !mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({ success: false, message: "Valid subscriptionId is required" });
    }
    const result = await OverageService.calculateOverage({ subscriptionId, periodStart, periodEnd });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const generateOverageInvoice = async (req, res) => {
  try {
    const { subscriptionId, periodStart, periodEnd, invoiceId } = req.body;
    if (!subscriptionId || !mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({ success: false, message: "Valid subscriptionId is required" });
    }
    const result = await OverageService.generateOverageInvoice({ subscriptionId, periodStart, periodEnd, invoiceId });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getOverages,
  getOverage,
  createOverage,
  updateOverage,
  deleteOverage,
  updateOverageStatus,
  calculateOverage,
  generateOverageInvoice,
};
