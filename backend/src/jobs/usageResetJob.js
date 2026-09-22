const logger = require("../config/logger");
const JobLogService = require("../service/JobLogService");
const UsageCounter = require("../models/UsageCounter");
const UsageThresholdEvent = require("../models/UsageThresholdEvent");
const { periodKeyFor } = require("../service/UsageService");

const RESETTABLE_RESOURCES = ["orders", "api_calls", "emails", "ai_credits", "sms"];

const CUMULATIVE_RESOURCES = ["products", "storage", "images", "categories", "brands", "variants", "customers"];

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

const previousPeriodKey = (reference = new Date()) => {
  const d = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return periodKeyFor(d);
};

const resetMonthlyUsage = async ({ reference = new Date() } = {}) => {
  const resetResult = await UsageCounter.updateMany(
    { quotaTypeCode: { $in: RESETTABLE_RESOURCES } },
    { $set: { used: 0, lastResetAt: new Date() } }
  );

  const cleared = await UsageThresholdEvent.deleteMany({
    periodKey: previousPeriodKey(reference),
  });

  return {
    countersReset: resetResult.modifiedCount || 0,
    thresholdEventsCleared: cleared.deletedCount || 0,
    resettableResources: RESETTABLE_RESOURCES,
  };
};

const shouldRunNow = (reference = new Date()) =>
  reference.getUTCDate() === 1 && reference.getUTCHours() === 0 && reference.getUTCMinutes() < 10;

const runUsageResetCheck = async () => {
  const now = new Date();
  if (!shouldRunNow(now)) return { skipped: true };

  const result = await resetMonthlyUsage({ reference: now });
  logger.info(
    `usageResetJob: countersReset=${result.countersReset} thresholdEventsCleared=${result.thresholdEventsCleared}`
  );
  return result;
};

const startUsageResetJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (process.env.ENABLE_USAGE_RESET_JOB !== "true") {
    logger.info("usageResetJob: disabled (set ENABLE_USAGE_RESET_JOB=true in .env to enable).");
    return null;
  }

  const runSafely = () => {
    JobLogService.runJob("usageResetJob", runUsageResetCheck).catch((err) =>
      logger.error("usageResetJob failed:", err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = {
  startUsageResetJob,
  runUsageResetCheck,
  resetMonthlyUsage,
  previousPeriodKey,
  shouldRunNow,
  RESETTABLE_RESOURCES,
  CUMULATIVE_RESOURCES,
};
