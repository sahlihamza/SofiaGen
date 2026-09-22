const logger = require("../config/logger");
const JobLogService = require("../service/JobLogService");
const Notification = require("../models/Notification");
const NotificationDelivery = require("../models/NotificationDelivery");
const NotificationLog = require("../models/NotificationLog");
const User = require("../models/User");
const Customer = require("../models/Customer");
const NotificationDispatcher = require("../service/NotificationDispatcher");

const RECIPIENT_MODELS = { User, Customer };

const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 5 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

const processPendingDeliveries = async () => {
  const now = new Date();

  const deliveries = await NotificationDelivery.find({
    channel: { $ne: "in_app" },
    status: "pending",
    attempts: { $lt: MAX_ATTEMPTS },
    $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
  }).limit(200);

  for (const delivery of deliveries) {
    const RecipientModel = RECIPIENT_MODELS[delivery.recipientModel] || User;
    const [notification, recipient] = await Promise.all([
      Notification.findById(delivery.notificationId).lean(),
      RecipientModel.findById(delivery.recipientId).select("_id email").lean(),
    ]);

    if (!notification || !recipient) {
      delivery.status = "failed";
      delivery.failedAt = now;
      delivery.error = "Notification or recipient no longer exists";
      await delivery.save();
      continue;
    }

    delivery.attempts += 1;
    delivery.lastAttemptAt = now;

    try {
      await NotificationDispatcher.send(delivery.channel, notification, recipient);
      delivery.status = "sent";
      delivery.sentAt = now;
      delivery.error = undefined;

      await NotificationLog.create({
        action: "notification.sent",
        notificationId: notification._id,
        storeId: notification.storeId,
        metadata: { channel: delivery.channel, attempts: delivery.attempts },
      }).catch(() => {});
    } catch (err) {
      delivery.error = err.message;

      if (delivery.attempts >= MAX_ATTEMPTS) {
        delivery.status = "failed";
        delivery.failedAt = now;

        await NotificationLog.create({
          action: "notification.failed",
          notificationId: notification._id,
          storeId: notification.storeId,
          metadata: { channel: delivery.channel, attempts: delivery.attempts, error: err.message },
        }).catch(() => {});
      } else {
        delivery.nextRetryAt = new Date(
          now.getTime() + BASE_RETRY_DELAY_MS * 2 ** (delivery.attempts - 1)
        );
      }
    }

    await delivery.save();
  }

  return deliveries.length;
};

const archiveExpiredNotifications = async () => {
  const now = new Date();
  const result = await Notification.updateMany(
    { expiresAt: { $ne: null, $lte: now }, status: { $ne: "archived" } },
    { $set: { status: "archived" } }
  );
  return result.modifiedCount || 0;
};

const runNotificationDelivery = async () => {
  const processed = await processPendingDeliveries();
  const archived = await archiveExpiredNotifications();
  if (processed > 0 || archived > 0) {
    logger.info(`notificationDeliveryJob: processed=${processed} archived=${archived}`);
  }
};

const startNotificationDeliveryJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (process.env.ENABLE_NOTIFICATION_DELIVERY_JOB !== "true") {
    logger.info(
      "notificationDeliveryJob: disabled (set ENABLE_NOTIFICATION_DELIVERY_JOB=true in .env to enable)."
    );
    return null;
  }

  const runSafely = () => {
    JobLogService.runJob("notificationDeliveryJob", runNotificationDelivery).catch((err) =>
      logger.error("notificationDeliveryJob failed:", err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = {
  startNotificationDeliveryJob,
  runNotificationDelivery,
  processPendingDeliveries,
  archiveExpiredNotifications,
};
