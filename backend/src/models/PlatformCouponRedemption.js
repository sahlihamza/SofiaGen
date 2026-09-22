const mongoose = require("mongoose");

const platformCouponRedemptionSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformCoupon",
      required: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: false,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: false,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    duration: {
      type: String,
      enum: ["once", "repeating", "forever"],
      default: "once",
    },
    periodsRemaining: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["applied", "reverted"],
      default: "applied",
    },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    revertedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "platform_coupon_redemptions",
  }
);

platformCouponRedemptionSchema.index(
  { couponId: 1, subscriptionId: 1 },
  { unique: true }
);
platformCouponRedemptionSchema.index({ couponId: 1, storeId: 1 });
platformCouponRedemptionSchema.index({ storeId: 1, appliedAt: -1 });

const PlatformCouponRedemption = mongoose.model(
  "PlatformCouponRedemption",
  platformCouponRedemptionSchema
);

module.exports = PlatformCouponRedemption;
