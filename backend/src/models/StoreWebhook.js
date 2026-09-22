const mongoose = require("mongoose");

/**
 * Outgoing webhook configuration for a store. The signing secret is generated
 * server-side and only its SHA-256 hash is persisted; it is shown exactly once
 * at creation / rotation.
 */
const storeWebhookSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    url: { type: String, required: true, trim: true },
    events: [{ type: String, trim: true }],
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    secretHash: { type: String, required: true, select: false },
    // e.g. "whsec_&9f2c"  display-only hint for the "Secret status" column.
    secretHint: { type: String, default: "" },
    lastDeliveryAt: { type: Date, default: null },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    consecutiveFailures: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

storeWebhookSchema.index({ storeId: 1, status: 1 });

module.exports = mongoose.model("StoreWebhook", storeWebhookSchema);
