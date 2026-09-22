const logger = require("../config/logger");
const JobLogService = require("../service/JobLogService");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const Store = require("../models/Store");
const { emitEvent } = require("../lib/eventBus");
const SubscriptionStateMachine = require("../service/SubscriptionStateMachine");
const { STATUS, expandForQuery } = require("../utils/subscriptionStatus");

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const EXPIRING_WARNING_DAYS = 7;

const suspendExpiredGracePeriods = async () => {
  const now = new Date();

  const expiredGrace = await Subscription.find({
    status: STATUS.GRACE_PERIOD,
    graceEndsAt: { $ne: null, $lte: now },
  }).select("_id storeId currentPlanName graceEndsAt");

  let suspended = 0;
  for (const subscription of expiredGrace) {
    try {
      await SubscriptionStateMachine.transition(subscription._id, STATUS.SUSPENDED, {
        reason: "grace_period_expired",
        source: "job",
      });
      suspended += 1;
    } catch (err) {
      logger.error(
        `subscriptionExpiryJob: suspension de ${subscription._id} echouee: ${err.message}`
      );
    }
  }

  return suspended;
};

const checkExpiringSubscriptions = async () => {
  const now = new Date();
  const warningThreshold = new Date(now.getTime() + EXPIRING_WARNING_DAYS * 24 * 60 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);

  const expiring = await Subscription.find({
    status: { $in: expandForQuery([STATUS.ACTIVE, STATUS.TRIALING]) },
    currentPeriodEnd: { $gt: now, $lte: warningThreshold },
  }).select("_id storeId currentPlanName currentPeriodEnd");

  for (const subscription of expiring) {
    emitEvent("subscription.expiring", {
      storeId: subscription.storeId,
      entityId: subscription._id,
      metadata: {
        planName: subscription.currentPlanName || "",
        expiresAt: subscription.currentPeriodEnd?.toISOString().slice(0, 10),
      },
      actionUrl: "/store/my-subscription",
      deduplicationKey: `subscription.expiring:${subscription._id}:${today}`,
    });
  }

  return expiring.length;
};

const expireOverdueSubscriptions = async () => {
  const now = new Date();

  const expired = await Subscription.find({
    status: { $in: expandForQuery([STATUS.ACTIVE, STATUS.TRIALING, STATUS.PAST_DUE]) },
    currentPeriodEnd: { $lt: now },
  }).select("_id storeId currentPlanName status");

  for (const subscription of expired) {
    try {
      await SubscriptionStateMachine.transition(subscription._id, STATUS.EXPIRED, {
        reason: "current_period_ended",
        source: "job",
      });
    } catch (err) {
      logger.error(
        `subscriptionExpiryJob: expiration de ${subscription._id} refusee: ${err.message}`
      );
      continue;
    }

    emitEvent("subscription.expired", {
      storeId: subscription.storeId,
      entityId: subscription._id,
      metadata: { planName: subscription.currentPlanName || "" },
      actionUrl: "/store/my-subscription",
    });
  }

  return expired.length;
};

const markOverdueInvoices = async () => {
  const now = new Date();

  const overdue = await Invoice.find({
    status: { $in: ["draft", "sent"] },
    dueDate: { $ne: null, $lt: now },
  }).select("_id storeId invoiceNumber");

  for (const invoice of overdue) {
    await Invoice.updateOne({ _id: invoice._id }, { $set: { status: "overdue" } });

    emitEvent("invoice.overdue", {
      storeId: invoice.storeId,
      entityId: invoice._id,
      metadata: { invoiceNumber: invoice.invoiceNumber },
      actionUrl: `/dashboard/invoices/${invoice._id}`,
    });
  }

  return overdue.length;
};

const runSubscriptionExpiryCheck = async () => {
  const expiringCount = await checkExpiringSubscriptions();
  const suspendedCount = await suspendExpiredGracePeriods();
  const expiredCount = await expireOverdueSubscriptions();
  const overdueInvoiceCount = await markOverdueInvoices();

  if (expiringCount + suspendedCount + expiredCount + overdueInvoiceCount > 0) {
    logger.info(
      `subscriptionExpiryJob: expiring=${expiringCount} graceSuspended=${suspendedCount} expired=${expiredCount} overdueInvoices=${overdueInvoiceCount}`
    );
  }

  return { expiringCount, suspendedCount, expiredCount, overdueInvoiceCount };
};

const startSubscriptionExpiryJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (process.env.ENABLE_SUBSCRIPTION_EXPIRY_JOB !== "true") {
    logger.info(
      "subscriptionExpiryJob: disabled (set ENABLE_SUBSCRIPTION_EXPIRY_JOB=true in .env to enable)."
    );
    return null;
  }

  const runSafely = () => {
    JobLogService.runJob("subscriptionExpiryJob", runSubscriptionExpiryCheck).catch((err) =>
      logger.error("subscriptionExpiryJob failed:", err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = {
  startSubscriptionExpiryJob,
  runSubscriptionExpiryCheck,
  checkExpiringSubscriptions,
  expireOverdueSubscriptions,
  suspendExpiredGracePeriods,
  markOverdueInvoices,
};
