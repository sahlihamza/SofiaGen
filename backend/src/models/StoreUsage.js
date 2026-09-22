/**
 * StoreUsage (legacy)
 *
 * DEPRECATED: UsageCounter is the preferred model for quota tracking.
 * This model is kept for backward compatibility with SoftLimitService.
 * Migrate to UsageCounter when coordinating with the Billing Epic.
 */
const mongoose = require("mongoose");

const storeUsageSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    quotaTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuotaType",
      required: true,
      index: true,
    },
used: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAlertAt: { type: Date, required: false },
    // P17  Soft Limits execution state
    softLimitState: {
      type: String,
      enum: ["ok", "warning", "critical", "blocked"],
      default: "ok",
    },
    warningNotifiedAt: { type: Date, required: false },
    criticalNotifiedAt: { type: Date, required: false },
    blockedAt: { type: Date, required: false },
    blockedActionTaken: {
      type: String,
      enum: ["block", "read_only", "grace_period", "notify", "none"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

storeUsageSchema.index({ storeId: 1, quotaTypeId: 1 }, { unique: true });

module.exports = mongoose.model("StoreUsage", storeUsageSchema);
