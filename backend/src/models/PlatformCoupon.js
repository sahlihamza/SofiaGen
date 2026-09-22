const mongoose = require("mongoose");

const platformCouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Le code du coupon plateforme est obligatoire"],
      uppercase: true,
      trim: true,
      unique: true,
    },
    title: {
      type: String,
      required: [true, "Le titre du coupon est obligatoire"],
      trim: true,
    },
    description: {
      type: String,
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
      validate: {
        validator: function (value) {
          if (this.discountType === "percentage") return value <= 100;
          return true;
        },
        message: "Une remise en pourcentage ne peut pas dépasser 100",
      },
    },
    applicableTo: {
      type: String,
      enum: ["subscription"],
      default: "subscription",
    },
    planIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan",
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive", "scheduled", "expired", "archived"],
      default: "active",
    },
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
    },
    duration: {
      type: String,
      enum: ["once", "repeating", "forever"],
      default: "once",
    },
    durationInPeriods: {
      type: Number,
      min: 1,
      default: null,
      validate: {
        validator: function (value) {
          if (this.duration === "repeating") return Number.isInteger(value) && value >= 1;
          return value === null || value === undefined;
        },
        message:
          "durationInPeriods est obligatoire (entier >= 1) pour duration=repeating, et interdit sinon",
      },
    },
    firstSubscriptionOnly: {
      type: Boolean,
      default: false,
    },
    usageLimit: {
      type: Number,
      default: null,
    },
    usageLimitPerCustomer: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

platformCouponSchema.index({ code: 1 }, { unique: true });
platformCouponSchema.index({ status: 1 });
platformCouponSchema.index({ deletedAt: 1 });
platformCouponSchema.index({ startDate: 1 });
platformCouponSchema.index({ endDate: 1 });

const PlatformCoupon = mongoose.model("PlatformCoupon", platformCouponSchema);

module.exports = PlatformCoupon;