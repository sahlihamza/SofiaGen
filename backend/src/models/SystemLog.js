const mongoose = require("mongoose");

// LOG-1: centralized technical/system log  API requests, DB/queue/webhook
// errors, application warnings, etc. Distinct from AuditLog (business
// actions performed by a user on an entity)  this is for technical events.
const systemLogSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      required: true,
      enum: ["debug", "info", "warning", "error", "critical"],
      default: "info",
    },
    category: {
      type: String,
      required: true,
      enum: [
        "api",
        "database",
        "auth",
        "payment",
        "webhook",
        "queue",
        "email",
        "system",
        "security",
        "performance",
      ],
    },
    service: {
      type: String,
      required: false,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    errorCode: {
      type: String,
      required: false,
      trim: true,
    },
    stackTrace: {
      type: String,
      required: false,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    requestId: {
      type: String,
      required: false,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: "system_logs",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

systemLogSchema.index({ level: 1, createdAt: -1 });
systemLogSchema.index({ category: 1, createdAt: -1 });
systemLogSchema.index({ storeId: 1, createdAt: -1 });
systemLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("SystemLog", systemLogSchema);
