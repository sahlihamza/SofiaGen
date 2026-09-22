const logger = require("../config/logger");
const EmailProvider = require("../lib/EmailProvider");
const { emitToUser } = require("../lib/socket");

const InAppChannel = {
  async send(notification, recipient) {
    emitToUser(recipient._id, "notification.created", { notification });
    return { ok: true };
  },
};

const EmailChannel = {
  async send(notification, recipient) {
    if (!recipient?.email) {
      throw new Error("Recipient has no email address");
    }
    const isRtl = notification.locale === "ar";
    const html = `<div dir="${isRtl ? "rtl" : "ltr"}" style="text-align: ${
      isRtl ? "right" : "left"
    };"><p>${notification.message}</p></div>`;

    await EmailProvider.send({
      to: recipient.email,
      subject: notification.title,
      html,
      text: notification.message,
      context: {
        userId: notification.actorId || null,
        storeId: notification.storeId || null,
      },
      emailType: "notification",
      relatedEntity: notification.entityId || null,
    });
    return { ok: true };
  },
};

const PushChannel = {
  async send() {
    throw new Error("Push channel is not implemented yet (Phase 3)");
  },
};

const channels = {
  in_app: InAppChannel,
  email: EmailChannel,
  push: PushChannel,
};

const send = async (channelName, notification, recipient) => {
  const channel = channels[channelName];
  if (!channel) {
    throw new Error(`Unknown notification channel: ${channelName}`);
  }
  try {
    return await channel.send(notification, recipient);
  } catch (err) {
    logger.error(`NotificationDispatcher: ${channelName} send failed:`, err.message);
    throw err;
  }
};

module.exports = { send, channels };
