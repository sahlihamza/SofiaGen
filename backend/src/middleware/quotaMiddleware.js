const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const PlanQuota = require("../models/PlanQuota");
const UsageCounter = require("../models/UsageCounter");
const GracePeriod = require("../models/GracePeriod");
const cache = require("../lib/cache");
const logger = require("../config/logger");
const { resolveStoreId } = require("../utils/requestContext");

/**
 * Middleware de vérification de quota.
 *
 * Usage :
 *   router.post("/products", isAuth, loadUser, quotaMiddleware("products"), controller);
 *   router.post("/orders", isAuth, loadUser, quotaMiddleware("orders", { increment: 1 }), controller);
 *   router.post("/storage/upload", isAuth, loadUser, upload.single("file"), quotaMiddleware("storage", { sizeMb: fileSize }), controller);
 *
 * Options :
 *   - increment : nombre  incrémenter (défaut: 1)
 *   - sizeMb : taille en MB (pour les quotas de stockage)
 *   - onExceeded : callback custom (optionnel)
 *   - skipIncrement : true pour vérifier sans incrémenter
 *   - allowGrace : true pour autoriser en grace period (défaut: true)
 */
function quotaMiddleware(quotaTypeCode, options = {}) {
  const {
    increment = 1,
    sizeMb = 0,
    onExceeded = null,
    skipIncrement = false,
    allowGrace = true,
  } = options;

  return async (req, res, next) => {
    try {
      const storeId = resolveStoreId(req);
      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: "Aucun store actif",
          code: "NO_ACTIVE_STORE",
        });
      }

      const result = await checkQuota({
        storeId,
        quotaTypeCode,
        increment,
        sizeMb,
        allowGrace,
      });

      if (!result.allowed) {
        if (onExceeded) {
          return onExceeded(req, res, result);
        }

        return res.status(403).json({
          success: false,
          message: result.message,
          code: "QUOTA_EXCEEDED",
          quota: {
            type: quotaTypeCode,
            used: result.used,
            limit: result.limit,
            remaining: result.remaining,
            state: result.state,
          },
        });
      }

      req.quotaInfo = {
        type: quotaTypeCode,
        used: result.used,
        limit: result.limit,
        remaining: result.remaining,
        state: result.state,
      };

      if (!skipIncrement && (increment > 0 || sizeMb > 0)) {
        await incrementQuota({
          storeId,
          quotaTypeCode,
          increment,
          sizeMb,
        });
      }

      next();
    } catch (err) {
      logger.error(`quotaMiddleware[${quotaTypeCode}] failed: ${err.message}`);
      next();
    }
  };
}

/**
 * Vérifie si l'incrémentation demandé est autorisé.
 */
async function checkQuota({
  storeId,
  quotaTypeCode,
  increment = 0,
  sizeMb = 0,
  allowGrace = true,
}) {
  const subscription = await Subscription.findOne({
    storeId,
    status: { $in: ["active", "trial", "past_due"] },
  })
    .select("planId planVersion status trialEndDate currentPeriodStart currentPeriodEnd")
    .lean();

  if (!subscription) {
    return {
      allowed: false,
      message: "Aucun abonnement actif",
      state: "no_subscription",
    };
  }

  const planQuota = await PlanQuota.findOne({
    planId: subscription.planId,
    quotaTypeCode,
  }).lean();

  if (!planQuota) {
    return {
      allowed: true,
      limit: null,
      used: 0,
      remaining: null,
      state: "unlimited",
    };
  }

  if (planQuota.isUnlimited || planQuota.limitValue === null || planQuota.limitValue === undefined) {
    return {
      allowed: true,
      limit: null,
      used: 0,
      remaining: null,
      state: "unlimited",
    };
  }

  const periodStart = subscription.currentPeriodStart || new Date();
  const periodEnd = subscription.currentPeriodEnd || new Date(Date.now() + 30 * 86400000);

  const now = new Date();
  let counter = await UsageCounter.findOne({
    storeId,
    quotaTypeCode,
    periodStart: { $lte: now },
    periodEnd: { $gte: now },
  }).lean();

  if (!counter) {
    counter = {
      storeId,
      quotaTypeCode,
      periodStart,
      periodEnd,
      used: 0,
      softLimitLevel: "normal",
    };
  }

  const projectedUse = counter.used + increment + sizeMb;
  const limit = planQuota.limitValue;
  const remaining = Math.max(0, limit - counter.used);

  let state = "normal";
  if (projectedUse >= limit) {
    state = "blocked";
  } else if (projectedUse >= (limit * planQuota.criticalThreshold) / 100) {
    state = "critical";
  } else if (projectedUse >= (limit * planQuota.warningThreshold) / 100) {
    state = "warning";
  }

  if (state === "blocked") {
    if (allowGrace && planQuota.blockedAction === "grace_period") {
      const gracePeriod = await getActiveGracePeriod(storeId, quotaTypeCode);
      if (gracePeriod && gracePeriod.graceEndDate > now) {
        return {
          allowed: true,
          limit,
          used: counter.used,
          remaining: Math.max(0, limit - projectedUse),
          state: "grace_period",
          graceEndDate: gracePeriod.graceEndDate,
        };
      }
    }

    return {
      allowed: false,
      message: `Quota ${quotaTypeCode} atteint (${counter.used}/${limit}). Passez  un plan supérieur.`,
      limit,
      used: counter.used,
      remaining: 0,
      state: "blocked",
      planQuota,
    };
  }

  return {
    allowed: true,
    limit,
    used: counter.used,
    remaining: Math.max(0, limit - projectedUse),
    state,
  };
}

/**
 * Incrémente le compteur de quota.
 */
async function incrementQuota({
  storeId,
  quotaTypeCode,
  increment = 0,
  sizeMb = 0,
}) {
  const total = increment + sizeMb;
  if (total <= 0) return;

  const subscription = await Subscription.findOne({
    storeId,
    status: { $in: ["active", "trial", "past_due"] },
  }).lean();

  if (!subscription) return;

  const periodStart = subscription.currentPeriodStart || new Date();
  const periodEnd = subscription.currentPeriodEnd || new Date(Date.now() + 30 * 86400000);

  await UsageCounter.findOneAndUpdate(
    {
      storeId,
      quotaTypeCode,
      periodStart,
      periodEnd,
    },
    {
      $inc: { used: total },
      $set: {
        subscriptionId: subscription._id,
        lastIncrementAt: new Date(),
        lastIncrementSource: "api",
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  await cache.delPattern(`quota:${storeId}:${quotaTypeCode}:*`);
}

/**
 * Décrémente le compteur (utile pour les suppressions/annulations).
 */
async function decrementQuota({ storeId, quotaTypeCode, amount = 1 }) {
  const subscription = await Subscription.findOne({
    storeId,
    status: { $in: ["active", "trial", "past_due"] },
  }).lean();

  if (!subscription) return;

  const periodStart = subscription.currentPeriodStart || new Date();
  const periodEnd = subscription.currentPeriodEnd || new Date(Date.now() + 30 * 86400000);

  await UsageCounter.findOneAndUpdate(
    {
      storeId,
      quotaTypeCode,
      periodStart,
      periodEnd,
    },
    {
      $inc: { used: -amount },
      $set: { lastIncrementAt: new Date() },
    },
    { new: true }
  );

  await cache.delPattern(`quota:${storeId}:${quotaTypeCode}:*`);
}

/**
 * Récupère le statut complet des quotas d'un store.
 */
async function getStoreQuotaStatus(storeId) {
  const subscription = await Subscription.findOne({
    storeId,
    status: { $in: ["active", "trial", "past_due"] },
  }).lean();

  if (!subscription) {
    return { subscription: null, quotas: [] };
  }

  const planQuotas = await PlanQuota.find({
    planId: subscription.planId,
  }).lean();

  const periodStart = subscription.currentPeriodStart || new Date();
  const periodEnd = subscription.currentPeriodEnd || new Date(Date.now() + 30 * 86400000);

  const now = new Date();
  const counters = await UsageCounter.find({
    storeId,
    periodStart: { $lte: now },
    periodEnd: { $gte: now },
  }).lean();

  const counterMap = new Map(counters.map((c) => [c.quotaTypeCode, c]));

  const statuses = planQuotas.map((pq) => {
    const counter = counterMap.get(pq.quotaTypeCode) || { used: 0 };
    const limit = pq.isUnlimited ? null : pq.limitValue;
    const remaining = limit === null ? null : Math.max(0, limit - counter.used);
    const percentage = limit === null ? 0 : Math.round((counter.used / limit) * 100);

    let state = "normal";
    if (limit !== null) {
      if (counter.used >= limit) state = "blocked";
      else if (percentage >= pq.criticalThreshold) state = "critical";
      else if (percentage >= pq.warningThreshold) state = "warning";
    }

    return {
      quotaTypeCode: pq.quotaTypeCode,
      used: counter.used,
      limit,
      remaining,
      percentage,
      state,
      isUnlimited: pq.isUnlimited,
      resetAt: periodEnd,
    };
  });

  return {
    subscription: {
      status: subscription.status,
      planId: subscription.planId,
      planVersion: subscription.planVersion,
      periodStart,
      periodEnd,
    },
    quotas: statuses,
  };
}

/**
 * Récupère la grace period active pour un quota.
 */
async function getActiveGracePeriod(storeId, quotaTypeCode) {
  return GracePeriod.findOne({
    storeId,
    quotaTypeCode,
    status: "active",
    graceEndDate: { $gt: new Date() },
  }).lean();
}

module.exports = {
  quotaMiddleware,
  checkQuota,
  incrementQuota,
  decrementQuota,
  getStoreQuotaStatus,
  getActiveGracePeriod,
};
