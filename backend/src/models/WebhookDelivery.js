const mongoose = require("mongoose");

/**
 * One outbound delivery attempt for a store webhook. Retry re-executes the
 * stored payload and increments `attempt` on the same document.
 */
const webhookDeliverySchema = new mongoose.Schema(
  {
    webhookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreWebhook",
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    event: { type: String, required: true, trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    httpStatus: { type: Number, default: null },
    durationMs: { type: Number, default: null },
    attempt: { type: Number, default: 1 },
    status: { type: String, enum: ["success", "failed", "retrying"], default: "failed" },
    responseSnippet: { type: String, default: "" },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

webhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });

module.exports = mongoose.model("WebhookDelivery", webhookDeliverySchema);
