const mongoose = require("mongoose");
const UsageService = require("../service/UsageService");
const User = require("../models/User");

// /counters and /summary are shared by two very different callers: a Store
// Owner's self-service "My Usage" page (no permission to speak of  they
// just want their own numbers) and the platform admin's cross-store Usage
// Tracking screen (real "Platform Plan.view" permission, explicit
// ?storeId=). Gating the whole route behind that permission 403'd every
// real store owner out of their own page; removing the gate outright would
// let anyone pass another store's id and read its usage. This resolves the
// effective storeId so a caller without the platform permission can never
// see anything but their own store, no matter what they pass in the query.
const resolveScopedStoreId = async (req, requestedStoreId) => {
  const isPrivileged = Boolean(req.user?.isSuperAdmin) || Boolean(req.authContext?.permissions?.has("platform.plan.view"));
  if (isPrivileged && requestedStoreId) {
    return requestedStoreId;
  }
  const user = await User.findById(req.user._id).select("storeIds currentStoreId");
  return req.currentStoreId || user?.currentStoreId || user?.storeIds?.[0] || null;
};

const incrementUsage = async (req, res) => {
  try {
    const { storeId, quotaTypeCode, delta = 1, source = "other", reason, refId, refType, metadata } = req.body;
    if (!storeId || !quotaTypeCode || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, message: "Valid storeId and quotaTypeCode are required" });
    }
    const result = await UsageService.increment({
      storeId,
      quotaTypeCode,
      delta,
      source,
      reason,
      refId,
      refType,
      actor: req.user?._id,
      metadata,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getCurrentUsage = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({ success: false, message: "Invalid subscription id" });
    }
    const result = await UsageService.getCurrentUsage(subscriptionId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const getUsageHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50, storeId, quotaTypeCode, subscriptionId, periodStart, periodEnd } = req.query;
    const result = await UsageService.getHistory({ storeId, quotaTypeCode, subscriptionId, periodStart, periodEnd, page, limit });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const listUsageCounters = async (req, res) => {
  try {
    const { page = 1, limit = 20, storeId, subscriptionId, quotaTypeCode, status } = req.query;
    const effectiveStoreId = await resolveScopedStoreId(req, storeId);

    const result = await UsageService.listCounters({ storeId: effectiveStoreId, subscriptionId, quotaTypeCode, status, page, limit });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUsageSummary = async (req, res) => {
  try {
    const { storeId } = req.query;
    const effectiveStoreId = await resolveScopedStoreId(req, storeId);

    const result = await UsageService.getSummary(effectiveStoreId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  incrementUsage,
  getCurrentUsage,
  getUsageHistory,
  listUsageCounters,
  getUsageSummary,
};
