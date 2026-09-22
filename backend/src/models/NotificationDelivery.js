const mongoose = require("mongoose");

const notificationDeliverySchema = new mongoose.Schema(
  {
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["in_app", "email", "push", "sms", "whatsapp"],
      required: true,
    },
    recipientModel: {
      type: String,
      enum: ["User", "Customer"],
      default: "User",
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientModel",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      required: false,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      required: false,
      default: null,
    },
    sentAt: {
      type: Date,
      required: false,
      default: null,
    },
    failedAt: {
      type: Date,
      required: false,
      default: null,
    },
    error: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

notificationDeliverySchema.index({ status: 1, nextRetryAt: 1 });
notificationDeliverySchema.index({ notificationId: 1, channel: 1 });

const NotificationDelivery = mongoose.model("NotificationDelivery", notificationDeliverySchema);

module.exports = NotificationDelivery;
