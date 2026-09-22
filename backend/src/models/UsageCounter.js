const mongoose = require("mongoose");

/**
 * UsageCounter (P7)
 *
 * Period-based usage counter for a store on a subscription. Replaces/extends
 * StoreUsage with a per-billing-period scope and soft-limit level tracking.
 */
const usageCounterSchema = new mongoose.Schema(
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
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    used: {
      type: Number,
      default: 0,
      min: 0,
    },
    included: {
      type: Number,
      default: 0,
      min: 0,
    },
    softLimitLevel: {
      type: String,
      enum: ["normal", "warning", "critical", "blocked"],
      default: "normal",
    },
    overridden: {
      type: Boolean,
      default: false,
    },
    // Audit
    lastIncrementAt: { type: Date, required: false },
    lastResetAt: { type: Date, required: false, default: null },
    lastIncrementSource: { type: String, required: false },
  },
  { timestamps: true }
);

// Unique per store + quota type + billing period
usageCounterSchema.index({ storeId: 1, quotaTypeCode: 1, periodStart: 1, periodEnd: 1 }, { unique: true });
usageCounterSchema.index({ subscriptionId: 1, quotaTypeCode: 1 });

const UsageCounter = mongoose.model("UsageCounter", usageCounterSchema);
module.exports = UsageCounter;
