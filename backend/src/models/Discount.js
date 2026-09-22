const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformCoupon",
      required: false,
    },
    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      required: false,
      min: 0,
    },
    appliesTo: {
      type: String,
      enum: ["plan", "invoice", "overage", "subscription"],
      default: "plan",
    },
    minAmount: {
      type: Number,
      required: false,
      min: 0,
    },
    maxUses: {
      type: Number,
      required: false,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

discountSchema.index({ code: 1 }, { unique: true });
discountSchema.index({ couponId: 1 });
discountSchema.index({ active: 1, validFrom: 1, validUntil: 1 });

const Discount = mongoose.model("Discount", discountSchema);
module.exports = Discount;