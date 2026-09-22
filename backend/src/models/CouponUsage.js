const mongoose = require("mongoose");

// Story 4/18: one document per time a coupon is actually applied to an
// order. Coupon.usedCount is the fast running total; this collection is the
// detailed, queryable audit trail behind it.
const couponUsageSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["applied", "cancelled", "refunded"],
      default: "applied",
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "coupon_usages",
  }
);

couponUsageSchema.index(
  { couponId: 1, orderId: 1 },
  { unique: true, name: "one_coupon_usage_per_order" }
);
couponUsageSchema.index({ storeId: 1, couponId: 1 });
couponUsageSchema.index({ storeId: 1, customerId: 1 });
couponUsageSchema.index({ storeId: 1, orderId: 1 });
// SFG-78 Phase 2: sales analytics buckets discounts by usedAt within a
// storeId + date range, same access pattern as Order's storeId+createdAt index.
couponUsageSchema.index({ storeId: 1, usedAt: 1 });

const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);

module.exports = CouponUsage;
