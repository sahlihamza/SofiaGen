const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "notification.created",
        "notification.sent",
        "notification.failed",
        "notification.read",
        "notification.deleted",
        "notification.preference.updated",
      ],
      required: true,
      index: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: false,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

notificationLogSchema.index({ createdAt: -1 });

const NotificationLog = mongoose.model("NotificationLog", notificationLogSchema);

module.exports = NotificationLog;
