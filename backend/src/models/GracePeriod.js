const mongoose = require("mongoose");

const gracePeriodSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    quotaTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuotaType",
      required: false,
    },
    quotaTypeCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    graceStartDate: {
      type: Date,
      required: true,
    },
    graceEndDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "resolved", "escalated"],
      default: "active",
    },
    reason: {
      type: String,
      required: false,
    },
    notifiedAt: {
      type: Date,
      required: false,
    },
    resolvedAt: {
      type: Date,
      required: false,
    },
    resolutionNote: {
      type: String,
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  { timestamps: true }
);

gracePeriodSchema.index({ subscriptionId: 1, createdAt: -1 });
gracePeriodSchema.index({ storeId: 1, createdAt: -1 });
gracePeriodSchema.index({ status: 1, graceEndDate: 1 });

const GracePeriod = mongoose.model("GracePeriod", gracePeriodSchema);
module.exports = GracePeriod;