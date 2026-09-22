const logger = require("../../config/logger");

/**
 * AiQuotaService  plan-aware quota accounting for Malla.
 *
 * Integrates with the existing `quotaMiddleware` system. The quota types
 * declared in `seedUsageQuotas.js` are extended (in this module's
 * installer) with three new codes:
 *   - ai_messages_daily
 *   - ai_messages_monthly
 *   - ai_tokens_monthly
 *
 * Because the project standardises on the canonical quota middleware,
 * we reuse `checkQuota` + `incrementQuota` for both check and consume.
 * We never trust a frontend-reported "remaining" count.
 */

const AI_MESSAGES_DAILY = "ai_messages_daily";
const AI_MESSAGES_MONTHLY = "ai_messages_monthly";
const AI_TOKENS_MONTHLY = "ai_tokens_monthly";

const { checkQuota, incrementQuota } = require("../../middleware/quotaMiddleware");

/**
 * Throws an HTTP-shaped error when the quota is exceeded. The route
 * handler catches it and returns 403 with `code: "AI_QUOTA_EXCEEDED"`.
 */
class AiQuotaError extends Error {
  constructor(quotaType, info) {
    super(`Quota ${quotaType} atteint`);
    this.name = "AiQuotaError";
    this.code = "AI_QUOTA_EXCEEDED";
    this.quotaType = quotaType;
    this.info = info;
    this.httpStatus = 403;
  }
}

async function assertAndConsume({ storeId, type = AI_MESSAGES_DAILY, amount = 1 }) {
  // Platform usage (super-admin without active store) is uncapped for
  // V1. Real platform-level quotas will arrive in a future release; for
  // now, no QuotaType row exists for `storeId: null` so even passing
  // through would 404. Bail out early.
  if (!storeId) {
    return { allowed: true, used: 0, limit: null, remaining: null, state: "platform_unmetered" };
  }

  const result = await checkQuota({
    storeId,
    quotaTypeCode: type,
    increment: amount,
    allowGrace: true,
  });

  if (!result.allowed) {
    throw new AiQuotaError(type, {
      used: result.used,
      limit: result.limit,
      remaining: result.remaining,
      state: result.state,
    });
  }

  await incrementQuota({ storeId, quotaTypeCode: type, increment: amount });
  return result;
}

/**
 * Returns the current usage of the three AI counters. Used by
 * `GET /api/ai/usage` to drive the widget's progress bar.
 */
async function getUsageSnapshot(storeId) {
  const types = [AI_MESSAGES_DAILY, AI_MESSAGES_MONTHLY, AI_TOKENS_MONTHLY];
  const out = {};
  // Platform usage is unmetered for V1.
  if (!storeId) {
    for (const t of types) {
      out[t] = { used: 0, limit: null, remaining: null, state: "platform_unmetered" };
    }
    return out;
  }
  for (const t of types) {
    try {
      const r = await checkQuota({ storeId, quotaTypeCode: t, increment: 0, allowGrace: true });
      out[t] = {
        used: r.used,
        limit: r.limit,
        remaining: r.remaining,
        state: r.state,
      };
    } catch (err) {
      logger.warn(`[ai] quota check failed for ${t}: ${err.message}`);
      out[t] = { used: 0, limit: null, remaining: null, state: "unknown" };
    }
  }
  return out;
}

/**
 * Refunds the daily counter on a failed assistant response so a 502
 * from the upstream provider does not silently eat the user's quota.
 */
async function refundOnFailure({ storeId, type = AI_MESSAGES_DAILY, amount = 1 }) {
  try {
    const { decrementQuota } = require("../../middleware/quotaMiddleware");
    await decrementQuota({ storeId, quotaTypeCode: type, amount });
  } catch (err) {
    logger.warn(`[ai] quota refund failed for ${type}: ${err.message}`);
  }
}

module.exports = {
  AI_MESSAGES_DAILY,
  AI_MESSAGES_MONTHLY,
  AI_TOKENS_MONTHLY,
  assertAndConsume,
  getUsageSnapshot,
  refundOnFailure,
  AiQuotaError,
};