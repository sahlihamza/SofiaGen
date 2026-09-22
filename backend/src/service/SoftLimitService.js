const mongoose = require("mongoose");
const Store = require("../models/Store");
const Plan = require("../models/Plan");
const PlanQuota = require("../models/PlanQuota");
const EntitlementService = require("./EntitlementService");
const StoreUsage = require("../models/StoreUsage");
const QuotaType = require("../models/QuotaType");

/**
 * SoftLimitService
 *
 * P17  Soft Limits (Warning / Critical / Blocked)
 *
 * Determine the state of a store's usage against its plan's quota soft-limit
 * thresholds (defined on PlanQuota). Thresholds are percentages:
 *   - warningThreshold  (default 80%)
 *   - criticalThreshold (default 95%)
 *   - blockedThreshold  (default 100%)
 *
 * States: ok | warning | critical | blocked
 */

const STATE_OK = "ok";
const STATE_WARNING = "warning";
const STATE_CRITICAL = "critical";
const STATE_BLOCKED = "blocked";

const STATES = [STATE_OK, STATE_WARNING, STATE_CRITICAL, STATE_BLOCKED];

/**
 * Compute the percentage of usage vs a limit.
 * Returns null when the limit is unlimited or undefined.
 */
const pct = (used, limit) => {
  if (limit === undefined || limit === null || limit === 0) return null;
  return Math.min(100, Math.round((Number(used) / Number(limit)) * 100));
};

/**
 * Given a percentage and a PlanQuota, return the soft-limit state.
 */
const stateForPercentage = (percentage, quota) => {
  if (percentage === null || percentage === undefined) return STATE_OK;
  if (!quota.softLimitEnabled) return STATE_OK;

  const blocked = Number(quota.blockedThreshold ?? 100);
  const critical = Number(quota.criticalThreshold ?? 95);
  const warning = Number(quota.warningThreshold ?? 80);

  if (percentage >= blocked) return STATE_BLOCKED;
  if (percentage >= critical) return STATE_CRITICAL;
  if (percentage >= warning) return STATE_WARNING;
  return STATE_OK;
};

/**
 * Build the effective PlanQuota for a store for a given quota type code.
 * PlanQuota is the source of truth for thresholds. When no PlanQuota
 * document exists, the limit is derived from the store's published
 * PlanVersion via EntitlementService, never from the legacy Plan.limits map.
 */
const getEffectiveQuota = async (store, quotaType) => {
  const planId = store.planId;
  if (!planId) return null;

  let planQuota = await PlanQuota.findOne({ planId, quotaTypeCode: quotaType.code });
  if (planQuota) return planQuota;

  const entitled = await EntitlementService.getQuota(store._id, quotaType.code);
  if (!entitled) return null;

  return {
    planId,
    quotaTypeCode: quotaType.code,
    limitValue: entitled.isUnlimited ? null : entitled.limitValue,
    isUnlimited: entitled.isUnlimited,
    warningThreshold: entitled.warningThreshold ?? 80,
    criticalThreshold: entitled.criticalThreshold ?? 95,
    blockedThreshold: entitled.blockedThreshold ?? 100,
    blockedAction: "block",
    softLimitEnabled: !entitled.isUnlimited,
  };
};

/**
 * Evaluate and persist the soft-limit state for a single store/quota pair.
 * Returns the updated StoreUsage doc with the computed state.
 */
const evaluateStoreQuota = async (storeId, quotaTypeId) => {
  const store = await Store.findById(storeId);
  if (!store) {
    throw new Error(`Store ${storeId} not found`);
  }

  const quotaType = await QuotaType.findById(quotaTypeId);
  if (!quotaType) {
    throw new Error(`QuotaType ${quotaTypeId} not found`);
  }

  const effectiveQuota = await getEffectiveQuota(store, quotaType);
  if (!effectiveQuota) {
    return null;
  }

  const usage = await StoreUsage.findOne({ storeId, quotaTypeId }).populate("quotaTypeId", "code");
  if (!usage) {
    return null;
  }

  const used = usage.used || 0;
  const percentage = pct(used, effectiveQuota.limitValue);
  const state = stateForPercentage(percentage, effectiveQuota);

  const now = new Date();
  const prevState = usage.softLimitState || STATE_OK;

  usage.softLimitState = state;
  if (state === STATE_WARNING && !usage.warningNotifiedAt) usage.warningNotifiedAt = now;
  if (state === STATE_CRITICAL && !usage.criticalNotifiedAt) usage.criticalNotifiedAt = now;
  if (state === STATE_BLOCKED) {
    usage.blockedAt = now;
    usage.blockedActionTaken = effectiveQuota.blockedAction || "block";
  }
  if (state !== STATE_BLOCKED && usage.blockedActionTaken === "none") {
    usage.blockedActionTaken = "none";
  }
  usage.lastAlertAt = state !== STATE_OK ? now : usage.lastAlertAt;

  await usage.save();

  return {
    storeId: usage.storeId,
    storeName: store.name,
    quotaTypeId: usage.quotaTypeId,
    quotaTypeCode: quotaType.code,
    used,
    limit: effectiveQuota.limitValue,
    percentage,
    state,
    prevState,
    blockedAction: state === STATE_BLOCKED ? effectiveQuota.blockedAction : null,
    thresholds: {
      warning: effectiveQuota.warningThreshold,
      critical: effectiveQuota.criticalThreshold,
      blocked: effectiveQuota.blockedThreshold,
    },
  };
};

/**
 * Evaluate all store/quota pairs for a single store.
 */
const evaluateStore = async (storeId) => {
  const usages = await StoreUsage.find({ storeId });
  const results = [];
  for (const u of usages) {
    const r = await evaluateStoreQuota(storeId, u.quotaTypeId);
    if (r) results.push(r);
  }
  return results;
};

/**
 * Evaluate all stores OR all usages (global sweep, used by jobs).
 */
const evaluateAllStores = async ({ storeId } = {}) => {
  if (storeId) {
    return evaluateStore(storeId);
  }
  const usages = await StoreUsage.find({});
  const results = [];
  for (const u of usages) {
    const r = await evaluateStoreQuota(u.storeId, u.quotaTypeId).catch(() => null);
    if (r) results.push(r);
  }
  return results;
};

/**
 * List soft-limit states with store/plan enrichment + filters.
 */
const listSoftLimits = async ({ storeId, state, search, page = 1, limit = 20 }) => {
  const match = {};
  if (storeId) match.storeId = mongoose.Types.ObjectId.isValid(storeId) ? storeId : undefined;
  if (state && STATES.includes(state)) match.softLimitState = state;

  if (match.storeId === undefined) delete match.storeId;

  const skip = (page - 1) * limit;
  const total = await StoreUsage.countDocuments(match);

  const usages = await StoreUsage.find(match)
    .populate("storeId", "name planId planName")
    .populate("quotaTypeId", "code name unit")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  const rows = [];
  for (const u of usages) {
    const store = u.storeId;
    const quotaType = u.quotaTypeId;
    if (!store || !quotaType) continue;

    const effectiveQuota = await getEffectiveQuota(store, quotaType);
    const percentage = pct(u.used, effectiveQuota?.limitValue);
    rows.push({
      _id: u._id,
      storeId: store._id,
      storeName: store.name,
      planId: store.planId,
      planName: store.planName,
      quotaTypeId: quotaType._id,
      quotaTypeCode: quotaType.code,
      quotaTypeName: quotaType.name,
      unit: quotaType.unit,
      used: u.used,
      limit: effectiveQuota?.limitValue ?? null,
      percentage,
      state: u.softLimitState || STATE_OK,
      blockedActionTaken: u.blockedActionTaken,
      warningThreshold: effectiveQuota?.warningThreshold,
      criticalThreshold: effectiveQuota?.criticalThreshold,
      blockedThreshold: effectiveQuota?.blockedThreshold,
      lastAlertAt: u.lastAlertAt,
      updatedAt: u.updatedAt,
    });
  }

  return {
    data: rows,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / limit),
    },
  };
};
const resolveQuotaDecision = ({ used, limit, additional, blockedAction }) => {
  const wouldExceed = used + additional > limit;
  const resolvedAction = blockedAction || "block";
  const allowed = !wouldExceed || resolvedAction !== "block";
  return { allowed, wouldExceed, blockedAction: resolvedAction };
};

const checkQuotaAvailable = async (storeId, quotaTypeCode, additional = 1) => {
  if (!storeId) return { allowed: true, unlimited: true, used: null, limit: null };

  const store = await Store.findById(storeId);
  if (!store) return { allowed: true, unlimited: true, used: null, limit: null };

  const quotaType = await QuotaType.findOne({ code: String(quotaTypeCode).trim().toLowerCase() });
  if (!quotaType) return { allowed: true, unlimited: true, used: null, limit: null };

  const effectiveQuota = await getEffectiveQuota(store, quotaType);
  if (!effectiveQuota || effectiveQuota.isUnlimited || effectiveQuota.limitValue == null) {
    return { allowed: true, unlimited: true, used: null, limit: null };
  }

  const usage = await StoreUsage.findOne({ storeId, quotaTypeId: quotaType._id });
  const used = usage?.used || 0;
  const limit = effectiveQuota.limitValue;
  const decision = resolveQuotaDecision({ used, limit, additional, blockedAction: effectiveQuota.blockedAction });

  return { ...decision, unlimited: false, used, limit, quotaTypeCode: quotaType.code };
};

/**
 * Summary counts grouped by state.
 */
const getSummary = async () => {
  const [ok, warning, critical, blocked, total] = await Promise.all([
    StoreUsage.countDocuments({ softLimitState: STATE_OK }),
    StoreUsage.countDocuments({ softLimitState: STATE_WARNING }),
    StoreUsage.countDocuments({ softLimitState: STATE_CRITICAL }),
    StoreUsage.countDocuments({ softLimitState: STATE_BLOCKED }),
    StoreUsage.countDocuments({}),
  ]);
  return { total, ok, warning, critical, blocked };
};

module.exports = {
  STATES,
  STATE_OK,
  STATE_WARNING,
  STATE_CRITICAL,
  STATE_BLOCKED,
  pct,
  stateForPercentage,
  getEffectiveQuota,
  checkQuotaAvailable,
  resolveQuotaDecision,
  evaluateStoreQuota,
  evaluateStore,
  evaluateAllStores,
  listSoftLimits,
  getSummary,
};
