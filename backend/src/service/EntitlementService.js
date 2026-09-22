const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const PlanVersion = require("../models/PlanVersion");
const Plan = require("../models/Plan");
const { resolveStoreId } = require("../utils/requestContext");

const ENTITLED_STATUSES = ["active", "trial", "past_due"];

const featureNotIncluded = (featureCode) => {
  const err = new Error(`FEATURE_NOT_INCLUDED: ${featureCode}`);
  err.status = 403;
  err.code = "FEATURE_NOT_INCLUDED";
  err.feature = featureCode;
  return err;
};

const normalizeCode = (code) => String(code || "").trim().toLowerCase();

const resolvePlanVersion = async (storeId) => {
  if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) return null;

  const subscription = await Subscription.findOne({
    storeId,
    status: { $in: ENTITLED_STATUSES },
  }).select("planId planVersionId");

  if (!subscription) return null;

  if (subscription.planVersionId) {
    const version = await PlanVersion.findById(subscription.planVersionId);
    if (version) return version;
  }

  const plan = await Plan.findById(subscription.planId).select("currentVersionId deletedAt");
  if (!plan || plan.deletedAt || !plan.currentVersionId) return null;

  return PlanVersion.findById(plan.currentVersionId);
};

const readFeatureEntry = (version, featureCode) => {
  const wanted = normalizeCode(featureCode);
  const refs = version?.snapshot?.featureRefs || [];

  const ref = refs.find((f) => normalizeCode(f.code) === wanted);
  if (ref) return { found: true, enabled: ref.enabled !== false };

  const map = version?.snapshot?.features;
  if (map && typeof map.get === "function" && map.has(wanted)) {
    return { found: true, enabled: Boolean(map.get(wanted)) };
  }

  return { found: false, enabled: false };
};

const hasFeature = async (storeId, featureCode) => {
  const version = await resolvePlanVersion(storeId);
  if (!version) return false;
  return readFeatureEntry(version, featureCode).enabled;
};

const requireFeature = async (storeId, featureCode) => {
  if (!(await hasFeature(storeId, featureCode))) {
    throw featureNotIncluded(featureCode);
  }
  return true;
};

const getQuota = async (storeId, quotaTypeCode) => {
  const version = await resolvePlanVersion(storeId);
  if (!version) return null;

  const wanted = normalizeCode(quotaTypeCode);
  const refs = version.snapshot?.quotaRefs || [];
  const ref = refs.find((q) => normalizeCode(q.quotaTypeCode) === wanted);

  if (ref) {
    return {
      quotaTypeCode: wanted,
      limitValue: ref.isUnlimited ? null : ref.limitValue,
      isUnlimited: Boolean(ref.isUnlimited),
      warningThreshold: ref.softWarningAt ?? null,
      criticalThreshold: ref.softCriticalAt ?? null,
      blockedThreshold: ref.softBlockedAt ?? null,
      source: "planVersion.quotaRefs",
    };
  }

  const limits = version.snapshot?.limits;
  if (limits && typeof limits.get === "function" && limits.has(wanted)) {
    const raw = limits.get(wanted);
    return {
      quotaTypeCode: wanted,
      limitValue: raw === null || raw === undefined ? null : Number(raw),
      isUnlimited: raw === null || raw === undefined,
      warningThreshold: null,
      criticalThreshold: null,
      blockedThreshold: null,
      source: "planVersion.limits",
    };
  }

  return null;
};

const listFeatures = async (storeId) => {
  const version = await resolvePlanVersion(storeId);
  if (!version) return [];

  const refs = version.snapshot?.featureRefs || [];
  if (refs.length > 0) {
    return refs.map((f) => ({ code: normalizeCode(f.code), enabled: f.enabled !== false }));
  }

  const map = version.snapshot?.features;
  if (map && typeof map.entries === "function") {
    return [...map.entries()].map(([code, enabled]) => ({ code: normalizeCode(code), enabled: Boolean(enabled) }));
  }

  return [];
};

const requireFeatureMiddleware = (featureCode) => async (req, res, next) => {
  try {
    const storeId = req.storeId || req.currentStoreId || resolveStoreId(req);
    if (!storeId) {
      return res.status(400).json({
        success: false,
        code: "STORE_CONTEXT_MISSING",
        message: "Aucun store résolu pour cette requéte",
      });
    }
    await requireFeature(storeId, featureCode);
    return next();
  } catch (err) {
    if (err.code === "FEATURE_NOT_INCLUDED") {
      return res.status(403).json({
        success: false,
        code: err.code,
        feature: err.feature,
        message: `Cette fonctionnalité n'est pas incluse dans votre plan (${err.feature})`,
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  ENTITLED_STATUSES,
  hasFeature,
  requireFeature,
  requireFeatureMiddleware,
  getQuota,
  listFeatures,
  resolvePlanVersion,
};
