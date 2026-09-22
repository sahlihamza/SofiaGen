const mongoose = require("mongoose");

/**
 * UsageHistory (P7)
 *
 * Append-only log of every usage delta. Used for audit, billing and analytics.
 */
const usageHistorySchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: false,
      index: true,
    },
    quotaTypeCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    quotaTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuotaType",
      required: false,
    },
    delta: {
      type: Number,
      required: true,
    },
    // Positive/negative, source of the change
    reason: { type: String, required: false },
    source: {
      type: String,
      enum: ["order", "product", "customer", "api", "storage", "manual", "correction", "renewal", "subscription", "other"],
      default: "other",
    },
    // Reference to the triggering entity
    refId: { type: mongoose.Schema.Types.ObjectId, required: false },
    refType: { type: String, required: false },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    metadata: { type: mongoose.Schema.Types.Mixed, required: false },
  },
  { timestamps: true }
);

usageHistorySchema.index({ storeId: 1, quotaTypeCode: 1, createdAt: -1 });
usageHistorySchema.index({ subscriptionId: 1, createdAt: -1 });

const UsageHistory = mongoose.model("UsageHistory", usageHistorySchema);
module.exports = UsageHistory;
