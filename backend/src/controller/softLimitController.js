const mongoose = require("mongoose");
const SoftLimitService = require("../service/SoftLimitService");
const PlanQuota = require("../models/PlanQuota");

/**
 * GET /api/platform/soft-limits
 * List soft-limit states with filters/pagination.
 */
const getSoftLimits = async (req, res) => {
  try {
    const { storeId, state, search, page = 1, limit = 20 } = req.query;
    const result = await SoftLimitService.listSoftLimits({
      storeId,
      state,
      search,
      page,
      limit,
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/platform/soft-limits/summary
 * Global counts grouped by state.
 */
const getSoftLimitsSummary = async (req, res) => {
  try {
    const summary = await SoftLimitService.getSummary();
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/platform/soft-limits/evaluate
 * Evaluate a store (and all its usages) or a single usage pair.
 * body: { storeId, quotaTypeId? }
 */
const evaluateSoftLimits = async (req, res) => {
  try {
    const { storeId, quotaTypeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ success: false, message: "storeId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, message: "Invalid storeId" });
    }

    let result;
    if (quotaTypeId) {
      if (!mongoose.Types.ObjectId.isValid(quotaTypeId)) {
        return res.status(400).json({ success: false, message: "Invalid quotaTypeId" });
      }
      result = await SoftLimitService.evaluateStoreQuota(storeId, quotaTypeId);
    } else {
      result = await SoftLimitService.evaluateStore(storeId);
    }

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/platform/soft-limits/evaluate-all
 * Global sweep across all stores/usages (used by scheduler).
 */
const evaluateAllSoftLimits = async (req, res) => {
  try {
    const result = await SoftLimitService.evaluateAllStores({});
    res.status(200).json({ success: true, data: result, count: result.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/platform/soft-limits/plan-quotas
 * List PlanQuota docs with their soft-limit thresholds (for admin config UI).
 */
const getPlanQuotasWithSoftLimits = async (req, res) => {
  try {
    const { planId } = req.query;
    const query = {};
    if (planId) query.planId = planId;
    const quotas = await PlanQuota.find(query)
      .populate("planId", "name slug")
      .sort({ planId: 1, quotaTypeCode: 1 });
    res.status(200).json({ success: true, data: quotas });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/platform/soft-limits/plan-quotas/:id
 * Update soft-limit thresholds/actions on a PlanQuota.
 */
const updatePlanQuotaSoftLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      warningThreshold,
      criticalThreshold,
      blockedThreshold,
      blockedAction,
      softLimitEnabled,
    } = req.body;

    const quota = await PlanQuota.findById(id);
    if (!quota) {
      return res.status(404).json({ success: false, message: "Plan quota not found" });
    }

    if (warningThreshold !== undefined) quota.warningThreshold = warningThreshold;
    if (criticalThreshold !== undefined) quota.criticalThreshold = criticalThreshold;
    if (blockedThreshold !== undefined) quota.blockedThreshold = blockedThreshold;
    if (blockedAction !== undefined) quota.blockedAction = blockedAction;
    if (softLimitEnabled !== undefined) quota.softLimitEnabled = softLimitEnabled;

    await quota.save();
    res.status(200).json({ success: true, message: "Soft limit thresholds updated", data: quota });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSoftLimits,
  getSoftLimitsSummary,
  evaluateSoftLimits,
  evaluateAllSoftLimits,
  getPlanQuotasWithSoftLimits,
  updatePlanQuotaSoftLimit,
};
