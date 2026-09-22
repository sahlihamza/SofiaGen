const mongoose = require("mongoose");
const emailQueueJobSchema = new mongoose.Schema(
  {
    idempotencyKey: { type: String, required: true, unique: true },

    channel: { type: String, enum: ["platform", "store"], default: "platform" },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null, index: true },
    type: { type: String, required: true, index: true },
    to: { type: String, required: true },
    cc: { type: String },
    bcc: { type: String },
    from: { type: String },
    replyTo: { type: String },
    subject: { type: String, required: true },
    html: { type: String },
    text: { type: String },
    attachments: { type: mongoose.Schema.Types.Mixed },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
    relatedEntity: { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed", "dead"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    lastError: { type: String, default: null },
    nextAttemptAt: { type: Date, default: () => new Date(), index: true },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "email_queue_jobs" }
);

emailQueueJobSchema.index({ status: 1, nextAttemptAt: 1 });
emailQueueJobSchema.index({ type: 1, channel: 1, status: 1 });

module.exports = mongoose.model("EmailQueueJob", emailQueueJobSchema);
