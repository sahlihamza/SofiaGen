const mongoose = require("mongoose");
const dayjs = require("dayjs");
const UsageCounter = require("../models/UsageCounter");
const UsageHistory = require("../models/UsageHistory");
const StoreUsage = require("../models/StoreUsage");
const QuotaType = require("../models/QuotaType");
const Subscription = require("../models/Subscription");
const StoreUsageService = require("./StoreUsageService");
const SoftLimitService = require("./SoftLimitService");
const UsageThresholdEvent = require("../models/UsageThresholdEvent");
const EntitlementService = require("./EntitlementService");
const logger = require("../config/logger");
const { emitEvent } = require("../lib/eventBus");
const { ENTITLED_STATUSES, expandForQuery } = require("../utils/subscriptionStatus");

const THRESHOLDS = [80, 90, 100];

/**
 * UsageService (P7)
 *
 * Period-based usage tracking with append-only history.
 * - increment(): increments the current period counter + StoreUsage + history
 * - getCurrentUsage(): current period usage for a subscription
 * - getHistory(): append-only log for a store / quota / period
 */

const getQuotaType = async (code) => {
  const quotaType = await QuotaType.findOne({ code: String(code).trim().toLowerCase() });
  if (!quotaType) throw new Error(`Quota type '${code}' not found`);
  return quotaType;
};

const getCurrentPeriod = (subscription, now = new Date()) => {
  const start = subscription?.currentPeriodStart || dayjs(now).startOf("month").toDate();
  const end = subscription?.currentPeriodEnd || dayjs(start).add(1, "month").toDate();
  return { periodStart: start, periodEnd: end };
};

/**
 * Increment usage for a store + quota type. Writes to:
 *  - UsageCounter (period-scoped)
 *  - StoreUsage (StoreUsageService, maintains soft-limits)
 *  - UsageHistory (append-only)
 * Returns the updated UsageCounter.
 */
const increment = async ({ storeId, quotaTypeCode, delta = 1, source = "other", reason, refId, refType, actor, metadata }) => {
  if (!storeId) throw new Error("storeId is required");
  if (!quotaTypeCode) throw new Error("quotaTypeCode is required");
  const step = Number(delta) || 0;
  if (step === 0) return null;

  const quotaType = await getQuotaType(quotaTypeCode);

  // Find subscription for the store (if any)
  const subscription = await Subscription.findOne({ storeId, status: { $in: ["active", "trialing", "grace_period"] } }).sort({ createdAt: -1 });
  const { periodStart, periodEnd } = getCurrentPeriod(subscription);

  // 1. UsageCounter upsert
  const counter = await UsageCounter.findOneAndUpdate(
    {
      storeId,
      quotaTypeCode: quotaType.code,
      periodStart,
      periodEnd,
    },
    {
      $inc: { used: step },
      $set: {
        subscriptionId: subscription?._id,
        quotaTypeId: quotaType._id,
        lastIncrementAt: new Date(),
        lastIncrementSource: source,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // 2. StoreUsage (maintains soft-limit state)
  await StoreUsageService.updateUsage(storeId, quotaType.code, step);

  // 3. Append-only history
  await UsageHistory.create({
    storeId,
    subscriptionId: subscription?._id,
    quotaTypeCode: quotaType.code,
    quotaTypeId: quotaType._id,
    delta: step,
    source,
    reason,
    refId,
    refType,
    actor,
    metadata,
  });

  // 4. Re-evaluate soft limit
  const usage = await StoreUsage.findOne({ storeId, quotaTypeId: quotaType._id });
  if (usage) {
    await SoftLimitService.evaluateStoreQuota(storeId, quotaType._id).catch(() => null);
  }

  return counter;
};

/**
 * Get current usage for a subscription (all counters in the current period).
 */
const getCurrentUsage = async (subscriptionId) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");

  const { periodStart, periodEnd } = getCurrentPeriod(subscription);
  const counters = await UsageCounter.find({
    storeId: subscription.storeId,
    periodStart,
    periodEnd,
  }).populate("quotaTypeId", "code name unit");

  return {
    subscriptionId,
    storeId: subscription.storeId,
    planId: subscription.planId,
    periodStart,
    periodEnd,
    counters,
  };
};

/**
 * Get usage history for a store / quota / period.
 */
const getHistory = async ({ storeId, quotaTypeCode, subscriptionId, periodStart, periodEnd, page = 1, limit = 50 }) => {
  const query = {};
  if (storeId) query.storeId = storeId;
  if (subscriptionId) query.subscriptionId = subscriptionId;
  if (quotaTypeCode) query.quotaTypeCode = String(quotaTypeCode).trim().toLowerCase();
  if (periodStart || periodEnd) {
    query.createdAt = {};
    if (periodStart) query.createdAt.$gte = new Date(periodStart);
    if (periodEnd) query.createdAt.$lte = new Date(periodEnd);
  }

  const skip = (page - 1) * limit;
  const total = await UsageHistory.countDocuments(query);
  const docs = await UsageHistory.find(query)
    .populate("storeId", "name")
    .populate("quotaTypeId", "code name unit")
    .populate("actor", "name email")
    .sort({ createdAt: -1 })
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
 * List counters across subscriptions/stores with filters.
 */
const listCounters = async ({ storeId, subscriptionId, quotaTypeCode, status, page = 1, limit = 20 }) => {
  const query = {};
  if (storeId) query.storeId = storeId;
  if (subscriptionId) query.subscriptionId = subscriptionId;
  if (quotaTypeCode) query.quotaTypeCode = String(quotaTypeCode).trim().toLowerCase();
  if (status) query.softLimitLevel = status;

  const skip = (page - 1) * limit;
  const total = await UsageCounter.countDocuments(query);
  const docs = await UsageCounter.find(query)
    .populate("storeId", "name planName")
    .populate("quotaTypeId", "code name unit")
    .populate("subscriptionId", "planId status")
    .sort({ updatedAt: -1 })
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
 * Summary of usage counters.
 */
const getSummary = async (storeId) => {
  const baseQuery = storeId ? { storeId } : {};

  const [total, normal, warning, critical, blocked] = await Promise.all([
    UsageCounter.countDocuments(baseQuery),
    UsageCounter.countDocuments({ ...baseQuery, softLimitLevel: "normal" }),
    UsageCounter.countDocuments({ ...baseQuery, softLimitLevel: "warning" }),
    UsageCounter.countDocuments({ ...baseQuery, softLimitLevel: "critical" }),
    UsageCounter.countDocuments({ ...baseQuery, softLimitLevel: "blocked" }),
  ]);

  const storesWithUsage = storeId
    ? total > 0
      ? 1
      : 0
    : (await UsageCounter.distinct("storeId")).length;

  return {
    total,
    normal,
    warning,
    critical,
    blocked,
    storesWithUsage,
  };
};

const quotaExceeded = (quotaTypeCode, current, limit) => {
  const err = new Error("QUOTA_EXCEEDED");
  err.status = 403;
  err.code = "QUOTA_EXCEEDED";
  err.resource = quotaTypeCode;
  err.current = current;
  err.limit = limit;
  return err;
};

const periodKeyFor = (periodStart) => {
  const d = periodStart instanceof Date ? periodStart : new Date(periodStart);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const resolveEnforcementContext = async (storeId, quotaTypeCode) => {
  if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
    const err = new Error("storeId invalide");
    err.status = 400;
    err.code = "BAD_REQUEST";
    throw err;
  }

  const subscription = await Subscription.findOne({
    storeId,
    status: { $in: expandForQuery(ENTITLED_STATUSES) },
  }).select("_id currentPeriodStart currentPeriodEnd");

  if (!subscription) {
    const err = new Error("Aucun abonnement actif pour ce store");
    err.status = 403;
    err.code = "NO_ACTIVE_SUBSCRIPTION";
    throw err;
  }

  const { periodStart, periodEnd } = getCurrentPeriod(subscription);
  const quota = await EntitlementService.getQuota(storeId, quotaTypeCode);

  return { subscription, periodStart, periodEnd, quota };
};

const checkThresholdEvents = async ({ storeId, quotaTypeCode, current, limit, periodStart }) => {
  if (!limit || limit <= 0) return [];

  const pct = Math.floor((current / limit) * 100);
  const periodKey = periodKeyFor(periodStart);
  const fired = [];

  for (const threshold of THRESHOLDS) {
    if (pct < threshold) continue;

    try {
      await UsageThresholdEvent.create({
        storeId,
        quotaTypeCode,
        threshold,
        periodKey,
        current,
        limit,
        percentage: pct,
      });
    } catch (err) {
      if (err.code === 11000) continue;
      logger.error(`UsageService: seuil ${threshold}% non enregistre: ${err.message}`);
      continue;
    }

    fired.push(threshold);
    emitEvent("usage.threshold_reached", {
      storeId,
      entityId: storeId,
      metadata: { quotaTypeCode, threshold, current, limit, percentage: pct, periodKey },
    });
  }

  return fired;
};

const tryIncrementUsage = async (storeId, quotaTypeCode, amount = 1) => {
  const qty = Number(amount);
  if (!Number.isInteger(qty) || qty < 1) {
    const err = new Error("amount doit être un entier >= 1");
    err.status = 400;
    err.code = "BAD_REQUEST";
    throw err;
  }

  const { subscription, periodStart, periodEnd, quota } = await resolveEnforcementContext(
    storeId,
    quotaTypeCode
  );

  await UsageCounter.updateOne(
    { storeId, quotaTypeCode, periodStart, periodEnd },
    {
      $setOnInsert: { used: 0 },
      $set: {
        subscriptionId: subscription._id,
        included: quota && !quota.isUnlimited ? quota.limitValue : 0,
      },
    },
    { upsert: true }
  );

  const unlimited =
    !quota || quota.isUnlimited || quota.limitValue === null || quota.limitValue === undefined;

  if (unlimited) {
    const updated = await UsageCounter.findOneAndUpdate(
      { storeId, quotaTypeCode, periodStart, periodEnd },
      { $inc: { used: qty }, $set: { lastIncrementAt: new Date() } },
      { new: true }
    );
    return { allowed: true, unlimited: true, current: updated ? updated.used : qty, limit: null, quotaTypeCode };
  }

  const limit = Number(quota.limitValue);

  const updated = await UsageCounter.findOneAndUpdate(
    { storeId, quotaTypeCode, periodStart, periodEnd, used: { $lte: limit - qty } },
    { $inc: { used: qty }, $set: { lastIncrementAt: new Date() } },
    { new: true }
  );

  if (!updated) {
    const existing = await UsageCounter.findOne({ storeId, quotaTypeCode, periodStart, periodEnd }).select("used");
    throw quotaExceeded(quotaTypeCode, existing ? existing.used : null, limit);
  }

  const thresholdsFired = await checkThresholdEvents({
    storeId,
    quotaTypeCode,
    current: updated.used,
    limit,
    periodStart,
  });

  return {
    allowed: true,
    unlimited: false,
    current: updated.used,
    limit,
    remaining: Math.max(0, limit - updated.used),
    quotaTypeCode,
    thresholdsFired,
  };
};

const releaseQuota = async (storeId, quotaTypeCode, amount = 1) => {
  const qty = Number(amount) || 1;
  try {
    const { periodStart, periodEnd } = await resolveEnforcementContext(storeId, quotaTypeCode);
    const updated = await UsageCounter.findOneAndUpdate(
      { storeId, quotaTypeCode, periodStart, periodEnd, used: { $gte: qty } },
      { $inc: { used: -qty } },
      { new: true }
    );
    return updated ? updated.used : null;
  } catch (err) {
    logger.error(`UsageService: releaseQuota ${quotaTypeCode} echoue: ${err.message}`);
    return null;
  }
};

module.exports = {
  increment,
  getCurrentUsage,
  getHistory,
  listCounters,
  getSummary,
  getQuotaType,
  THRESHOLDS,
  tryIncrementUsage,
  releaseQuota,
  checkThresholdEvents,
  periodKeyFor,
};
