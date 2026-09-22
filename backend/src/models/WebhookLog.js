const mongoose = require("mongoose");

// LOG-3: generic, provider-agnostic webhook log. Payment providers already
// have their own richer PaymentWebhook model (payload/signature/retry
// scheduling)  this collection is the unified view the Super Admin browses
// across ALL webhook sources (payment, future: shipping, email, custom
// integrations...), so it stays intentionally lightweight.
const webhookLogSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      index: true,
    },
    event: {
      type: String,
      required: true,
      trim: true,
    },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      default: "inbound",
    },
    httpStatus: {
      type: Number,
      required: false,
    },
    attempts: {
      type: Number,
      default: 1,
    },
    durationMs: {
      type: Number,
      required: false,
    },
    status: {
      type: String,
      enum: ["received", "success", "failed", "retrying"],
      default: "received",
    },
    errorMessage: {
      type: String,
      required: false,
    },
    requestId: {
      type: String,
      required: false,
      index: true,
    },
    // Reference back to the domain-specific log (e.g. PaymentWebhook _id) so
    // a Super Admin can jump to full payload/signature details if needed.
    sourceRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    sourceModel: {
      type: String,
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: "webhook_logs",
    timestamps: true,
  }
);

webhookLogSchema.index({ provider: 1, createdAt: -1 });
webhookLogSchema.index({ storeId: 1, createdAt: -1 });
webhookLogSchema.index({ status: 1, createdAt: -1 });
webhookLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("WebhookLog", webhookLogSchema);
