const PlanVersion = require("../models/PlanVersion");
const Plan = require("../models/Plan");
const PlanFeature = require("../models/PlanFeature");
const PlanQuota = require("../models/PlanQuota");
const mongoose = require("mongoose");

/**
 * PlanVersionService
 *
 * - createSnapshot: persist a full immutable snapshot of a Plan (P13)
 * - listVersions: list history for a plan
 * - getVersion: retrieve one version
 * - rollback: restore a Plan document + its PlanFeature/PlanQuota to a snapshot
 */

const buildFeatureRefsSnapshot = async (planId) => {
  const features = await PlanFeature.find({ planId })
    .select("featureId featureGroupId code enabled limit status")
    .lean();
  return features.map((f) => ({
    featureId: f.featureId || null,
    featureGroupId: f.featureGroupId || null,
    code: f.code,
    enabled: f.enabled,
    limit: f.limit ?? null,
  }));
};

const buildQuotaRefsSnapshot = async (planId) => {
  const quotas = await PlanQuota.find({ planId })
    .select("quotaTypeId quotaTypeCode limitValue isUnlimited softWarningAt softCriticalAt softBlockedAt")
    .lean();
  return quotas.map((q) => ({
    quotaTypeId: q.quotaTypeId || null,
    quotaTypeCode: q.quotaTypeCode,
    limitValue: q.limitValue ?? null,
    isUnlimited: q.isUnlimited,
    softWarningAt: q.softWarningAt ?? null,
    softCriticalAt: q.softCriticalAt ?? null,
    softBlockedAt: q.softBlockedAt ?? null,
  }));
};

/**
 * Create a snapshot of the given plan (or by planId).
 * Returns the saved PlanVersion document.
 */
const createSnapshot = async (planOrId, { version, versionNote, changeDescription, source = "update", createdBy, ipAddress, changesSummary } = {}) => {
  const plan = planOrId instanceof mongoose.Model
    ? planOrId
    : await Plan.findById(planOrId);
  if (!plan) throw new Error("Plan not found");

  const nextVersion = version || plan.version || 1;
  const [featureRefs, quotaRefs] = await Promise.all([
    buildFeatureRefsSnapshot(plan._id),
    buildQuotaRefsSnapshot(plan._id),
  ]);

  const pricing = plan.pricing || {};
  const snapshot = {
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    badge: plan.badge,
    color: plan.color,
    icon: plan.icon,
    pricing: {
      monthly: pricing.monthly,
      yearly: pricing.yearly,
      currency: pricing.currency || "USD",
      taxIncluded: pricing.taxIncluded,
      trialDays: pricing.trialDays || 0,
      effectiveFrom: pricing.effectiveFrom,
      effectiveTo: pricing.effectiveTo,
    },
    features: plan.features || new Map(),
    limits: plan.limits || new Map(),
    featureRefs,
    quotaRefs,
    status: plan.status,
    isDefault: plan.isDefault,
    displayOrder: plan.displayOrder,
    visibility: plan.visibility || "public",
    notes: plan.notes,
  };

  const doc = await PlanVersion.create({
    planId: plan._id,
    version: nextVersion,
    snapshot,
    versionNote,
    changeDescription,
    source,
    changesSummary,
    createdBy,
    ipAddress,
  });

  return doc;
};

/**
 * List versions for a plan (newest first).
 */
const listVersions = async (planId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const total = await PlanVersion.countDocuments({ planId });
  const docs = await PlanVersion.find({ planId })
    .select("-snapshot.featureRefs -snapshot.quotaRefs")
    .populate("createdBy", "name email")
    .sort({ version: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));
  return {
    data: docs,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Retrieve a single version by planId+version or by id.
 */
const getVersion = async ({ planId, version, id } = {}) => {
  let query = {};
  if (id) query = { _id: id };
  else if (planId && version) query = { planId, version };
  else throw new Error("Either id or planId+version are required");

  const doc = await PlanVersion.findOne(query).populate("createdBy", "name email");
  if (!doc) throw new Error("Plan version not found");
  return doc;
};

/**
 * Rollback a Plan to a previous version.
 * Restores the plan document fields + PlanFeature + PlanQuota collections.
 */
const rollback = async ({ planId, version, createdBy, ipAddress, versionNote }) => {
  const versionDoc = await PlanVersion.findOne({ planId, version });
  if (!versionDoc) {
    throw new Error(`Plan version ${version} not found for this plan`);
  }
  const snap = versionDoc.snapshot;

  const plan = await Plan.findById(planId);
  if (!plan) throw new Error("Plan not found");

  const oldSnapshot = plan.toObject();

  // 1. Restore plan document top-level fields
  plan.name = snap.name;
  plan.slug = snap.slug;
  plan.description = snap.description;
  plan.badge = snap.badge;
  plan.color = snap.color;
  plan.icon = snap.icon;
  plan.pricing = snap.pricing;
  plan.features = snap.features || new Map();
  plan.limits = snap.limits || new Map();
  plan.status = snap.status;
  plan.isDefault = snap.isDefault;
  plan.displayOrder = snap.displayOrder;
  plan.visibility = snap.visibility || "public";
  plan.notes = snap.notes;

  // Bump version after rollback so we keep version history linear
  plan.version = (plan.version || 1) + 1;
  plan.updatedBy = createdBy;
  await plan.save();

  // 2. Restore PlanFeature collection
  await PlanFeature.deleteMany({ planId });
  if (snap.featureRefs && snap.featureRefs.length > 0) {
    await PlanFeature.insertMany(
      snap.featureRefs.map((f) => ({
        planId,
        featureId: f.featureId,
        featureGroupId: f.featureGroupId,
        code: f.code,
        enabled: f.enabled,
        limit: f.limit ?? null,
        status: "active",
      }))
    );
  } else if (snap.features) {
    // Legacy map fallback
    await PlanFeature.insertMany(
      Object.entries(Object.fromEntries(snap.features)).map(([code, enabled]) => ({
        planId,
        code,
        enabled,
        limit: null,
        status: "active",
      }))
    );
  }

  // 3. Restore PlanQuota collection
  await PlanQuota.deleteMany({ planId });
  if (snap.quotaRefs && snap.quotaRefs.length > 0) {
    await PlanQuota.insertMany(
      snap.quotaRefs.map((q) => ({
        planId,
        quotaTypeId: q.quotaTypeId,
        quotaTypeCode: q.quotaTypeCode,
        limitValue: q.limitValue,
        isUnlimited: q.isUnlimited,
        softWarningAt: q.softWarningAt ?? null,
        softCriticalAt: q.softCriticalAt ?? null,
        softBlockedAt: q.softBlockedAt ?? null,
      }))
    );
  } else if (snap.limits) {
    await PlanQuota.insertMany(
      Object.entries(Object.fromEntries(snap.limits)).map(([code, limitValue]) => ({
        planId,
        quotaTypeCode: code,
        limitValue,
        isUnlimited: limitValue == null,
      }))
    );
  }

  // 4. Create a new snapshot representing the post-rollback state
  const rollbackSnapshot = await createSnapshot(plan, {
    version: plan.version,
    versionNote: versionNote || `Rollback to version ${version}`,
    changeDescription: `Rolled back from version ${versionDoc.version} (source: ${versionDoc.source || "update"})`,
    source: "rollback",
    createdBy,
    ipAddress,
    changesSummary: {
      rollbackFrom: versionDoc.version,
      previousPlanVersion: oldSnapshot.version,
    },
  });

  return { plan, rollbackSnapshot };
};

/**
 * Compute a lightweight diff between two snapshots (for audit).
 */
const diffSnapshots = (before, after) => {
  const changes = {};
  if (!before) return { all: "initial" };
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes[key] = { old: a, new: b };
    }
  }
  return changes;
};

module.exports = {
  createSnapshot,
  listVersions,
  getVersion,
  rollback,
  diffSnapshots,
  buildFeatureRefsSnapshot,
  buildQuotaRefsSnapshot,
};

