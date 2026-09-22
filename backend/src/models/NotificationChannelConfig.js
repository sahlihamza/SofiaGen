const mongoose = require("mongoose");

/**
 * Persisted configuration for a notification channel (in_app/email/push/
 * sms/whatsapp). Provider secrets are write-only: they are stored here but
 * never returned by the API  the UI only sees a "configured" flag.
 */
const notificationChannelConfigSchema = new mongoose.Schema(
  {
    channelId: {
      type: String,
      required: true,
      unique: true,
      enum: ["in_app", "email", "push", "sms", "whatsapp"],
    },
    status: {
      type: String,
      enum: ["active", "configured", "disabled"],
      default: "disabled",
    },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationChannelConfig", notificationChannelConfigSchema);
