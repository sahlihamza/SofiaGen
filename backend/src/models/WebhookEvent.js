const mongoose = require("mongoose");

const webhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: false,
      trim: true,
    },
    payloadHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    eventIdSource: {
      type: String,
      enum: ["provider", "payload_hash"],
      default: "provider",
    },
    status: {
      type: String,
      enum: ["received", "processing", "processed", "failed", "ignored"],
      default: "received",
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    error: { type: String, required: false, default: null },
    result: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, required: false, default: null },
  },
  { timestamps: true, collection: "webhook_events" }
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true, name: "webhook_idempotency" });
webhookEventSchema.index({ provider: 1, status: 1, receivedAt: -1 });

module.exports = mongoose.model("WebhookEvent", webhookEventSchema);
