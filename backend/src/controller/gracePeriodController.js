const mongoose = require("mongoose");
const GracePeriodService = require("../service/GracePeriodService");

const createGracePeriod = async (req, res) => {
  try {
    const { subscriptionId, storeId, quotaTypeId, quotaTypeCode, graceDays, reason, metadata } = req.body;
    if (!subscriptionId || !storeId) {
      return res.status(400).json({ success: false, message: "subscriptionId and storeId are required" });
    }
    const result = await GracePeriodService.createGracePeriod({
      subscriptionId,
      storeId,
      quotaTypeId,
      quotaTypeCode,
      graceDays,
      reason,
      metadata,
    });
    res.status(201).json({ success: true, message: "Grace period created", data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getGracePeriods = async (req, res) => {
  try {
    const { page, limit, status, storeId, subscriptionId, quotaTypeCode, sort } = req.query;
    const result = await GracePeriodService.getGracePeriods({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      status,
      storeId,
      subscriptionId,
      quotaTypeCode,
      sort: sort || "-createdAt",
    });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getGracePeriodById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid grace period id" });
    }
    const result = await GracePeriodService.getGracePeriodById(id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const resolveGracePeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNote } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid grace period id" });
    }
    const result = await GracePeriodService.resolveGracePeriod(id, resolutionNote, req.user?._id);
    res.status(200).json({ success: true, message: "Grace period resolved", data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const escalateGracePeriod = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid grace period id" });
    }
    const result = await GracePeriodService.escalateGracePeriod(id, req.user?._id);
    res.status(200).json({ success: true, message: "Grace period escalated", data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const expireGracePeriods = async (req, res) => {
  try {
    const result = await GracePeriodService.expireGracePeriods();
    res.status(200).json({ success: true, message: "Expired grace periods processed", data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getActiveGracePeriods = async (req, res) => {
  try {
    const result = await GracePeriodService.getActiveGracePeriods();
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createGracePeriod,
  getGracePeriods,
  getGracePeriodById,
  resolveGracePeriod,
  escalateGracePeriod,
  expireGracePeriods,
  getActiveGracePeriods,
};