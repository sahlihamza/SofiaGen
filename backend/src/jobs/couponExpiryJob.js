const Coupon = require("../models/Coupon");
const Notification = require("../models/Notification");
const logger = require("../config/logger");
const JobLogService = require("../service/JobLogService");

// Story 17: no scheduled-job mechanism exists anywhere in this project yet
// (no node-cron, no existing setInterval pattern), so this is a minimal,
// dependency-free in-process timer rather than pulling in a cron library.
// Each coupon is only ever notified once per case, tracked via
// expiryNotifiedAt/expiringSoonNotifiedAt on the Coupon document  safe to
// call this on every tick without spamming notifications.

const SOON_THRESHOLD_DAYS = 3;
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const buildMessage = (coupon, kind) => {
  if (kind === "expired") return `Le coupon ${coupon.code} a expiré.`;
  const endDate = coupon.endDate ? new Date(coupon.endDate).toLocaleDateString("fr-FR") : "";
  return `Le coupon ${coupon.code} expire bientît (le ${endDate}).`;
};

// Exported standalone so it can be triggered directly (tests, or a manual
// "check now" admin action) without waiting for the interval.
const checkCouponExpiry = async () => {
  const now = new Date();
  const soonThreshold = new Date(now.getTime() + SOON_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  const justExpired = await Coupon.find({
    endDate: { $ne: null, $lte: now },
    expiryNotifiedAt: null,
    deletedAt: null,
  });
  for (const coupon of justExpired) {
    await Notification.create({ couponId: coupon._id, message: buildMessage(coupon, "expired") });
    coupon.expiryNotifiedAt = now;
    await coupon.save();
  }

  const soonExpiring = await Coupon.find({
    endDate: { $ne: null, $gt: now, $lte: soonThreshold },
    expiringSoonNotifiedAt: null,
    deletedAt: null,
  });
  for (const coupon of soonExpiring) {
    await Notification.create({ couponId: coupon._id, message: buildMessage(coupon, "expiringSoon") });
    coupon.expiringSoonNotifiedAt = now;
    await coupon.save();
  }

  return { expiredCount: justExpired.length, expiringSoonCount: soonExpiring.length };
};

const startCouponExpiryJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  const runSafely = () => {
    JobLogService.runJob("couponExpiryJob", checkCouponExpiry).catch((err) =>
      logger.error("couponExpiryJob failed:", err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = { checkCouponExpiry, startCouponExpiryJob };
