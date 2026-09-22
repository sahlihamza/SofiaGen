const Notification = require("../models/Notification");
const NotificationTemplate = require("../models/NotificationTemplate");
const NotificationPreference = require("../models/NotificationPreference");
const NotificationDelivery = require("../models/NotificationDelivery");
const NotificationLog = require("../models/NotificationLog");
const User = require("../models/User");
const Customer = require("../models/Customer");
const logger = require("../config/logger");
const NotificationDispatcher = require("./NotificationDispatcher");
const { emitToUser, emitToCustomer } = require("../lib/socket");
const { CRITICAL_CATEGORIES } = require("../models/NotificationPreference");

const RECIPIENT_MODELS = { User, Customer };

const VALID_CHANNELS = ["in_app", "email", "push", "sms", "whatsapp"];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderTemplate = (str, variables = {}) =>
  String(str || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? escapeHtml(variables[key]) : ""
  );

const localeOf = (recipient) => {
  const lang = recipient?.preferences?.language || recipient?.language;
  return ["fr", "en", "ar"].includes(lang) ? lang : "fr";
};

const computeChannels = ({ categoryPref, category, templateChannels }) => {
  const isCritical = CRITICAL_CATEGORIES.includes(category);

  const channels = VALID_CHANNELS.filter((channel) => {
    if (!templateChannels?.[channel]) return false;
    if (isCritical && (channel === "in_app" || channel === "email")) return true;
    if (!categoryPref) return true;
    return categoryPref[channel] !== false;
  });

  return channels.length > 0 ? channels : ["in_app"];
};

// `userId` here is really "the recipient's id" regardless of collection 
// kept as-is to avoid renaming the call site below. SFG-80 Phase 4: customer
// preferences are looked up the same way as agent ones now (see
// NotificationPreference.js for why customerId was added alongside userId).
const resolveChannelsForRecipient = async ({ userId, storeId, category, templateChannels, recipientModel = "User" }) => {
  const query =
    recipientModel === "User"
      ? { userId, storeId: storeId || null }
      : { customerId: userId, storeId: storeId || null };

  const pref = await NotificationPreference.findOne(query).lean();

  const categoryPref = pref?.preferences?.[category] || pref?.preferences?.get?.(category);

  return computeChannels({ categoryPref, category, templateChannels });
};

const notify = async ({
  event,
  storeId = null,
  actorId = null,
  entityType = null,
  entityId = null,
  recipients = [],
  recipientModel = "User",
  metadata = {},
  priority,
  actionUrl,
  category,
  deduplicationKey,
  expiresAt = null,
}) => {
  if (!event) throw new Error("NotificationService.notify: 'event' is required");
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return [];
  }

  const RecipientModel = RECIPIENT_MODELS[recipientModel];
  if (!RecipientModel) {
    throw new Error(`NotificationService.notify: unknown recipientModel '${recipientModel}'`);
  }

  const template = await NotificationTemplate.findOne({ code: event }).lean();

  if (template && template.enabled === false) {
    return [];
  }

  const effectivePriority = priority || template?.priority || "normal";
  const effectiveCategory = category || template?.category || "system";
  const templateChannels = template?.channels || { in_app: true, email: false, push: false };

  const selectFields =
    recipientModel === "User" ? "_id email preferences isSuperAdmin" : "_id email language name";

  const query = { _id: { $in: recipients } };
  // Customer model requires storeId for store-scoped queries
  if (recipientModel === "Customer" && storeId) {
    query.storeId = storeId;
  }

  const users = await RecipientModel.find(query)
    .select(selectFields)
    .lean();

  const created = [];

  for (const user of users) {
    const channels = await resolveChannelsForRecipient({
      userId: user._id,
      storeId,
      category: effectiveCategory,
      templateChannels,
      recipientModel,
    });

    const locale = localeOf(user);
    const title = template
      ? renderTemplate(template.title?.[locale] || template.title?.fr, metadata)
      : renderTemplate(metadata.title || event, metadata);
    const message = template
      ? renderTemplate(template.message?.[locale] || template.message?.fr, metadata)
      : renderTemplate(metadata.message || "", metadata);

    const dedupBucket = Math.floor(Date.now() / (5 * 60 * 1000));
    const dedupKey =
      deduplicationKey || (entityId ? `${event}:${entityId}:${user._id}:${dedupBucket}` : undefined);

    let notification;
    try {
      notification = await Notification.create({
        type: event,
        category: effectiveCategory,
        title,
        message: message || title,
        locale,
        recipientId: user._id,
        recipientModel,
        storeId,
        actorId,
        entityType,
        entityId,
        channels,
        priority: effectivePriority,
        metadata,
        actionUrl,
        expiresAt,
        deduplicationKey: dedupKey,
        status: "unread",
      });
    } catch (err) {
      if (err.code === 11000) {
        continue;
      }
      logger.error(`NotificationService.notify failed for user ${user._id}:`, err.message);
      continue;
    }

    await NotificationLog.create({
      action: "notification.created",
      notificationId: notification._id,
      actorId,
      storeId,
      metadata: { event, entityType, entityId },
    }).catch(() => {});

    for (const channel of channels) {
      await NotificationDelivery.create({
        notificationId: notification._id,
        channel,
        recipientId: user._id,
        recipientModel,
        status: channel === "in_app" ? "sent" : "pending",
        sentAt: channel === "in_app" ? new Date() : null,
      });

      if (channel === "in_app") {
        NotificationDispatcher.send("in_app", notification, user).catch(() => {});
      }
    }

    const unreadCount = await Notification.countDocuments({
      recipientId: user._id,
      recipientModel,
      status: "unread",
    });
    const emitFn = recipientModel === "Customer" ? emitToCustomer : emitToUser;
    emitFn(user._id, "notification.created", {
      notification: {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt,
      },
      unreadCount,
    });

    created.push(notification);
  }

  return created;
};

module.exports = { notify, renderTemplate, escapeHtml, resolveChannelsForRecipient, computeChannels };
