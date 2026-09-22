const mongoose = require("mongoose");

// Story 5: a single evaluable condition ("cartTotal > 100", "country = Tunisia"...).
// Grouped and combined with AND/OR by CouponRuleGroup (coupon_rules collection).
const couponConditionRuleSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    field: {
      type: String,
      enum: [
        "cartTotal",
        "customerGroup",
        "productCategory",
        "productBrand",
        "productId",
        "customerFirstOrder",
        "customerBirthday",
        "customerRegistrationDate",
        "country",
      ],
      required: true,
    },
    operator: {
      type: String,
      enum: ["equals", "notEquals", "greaterThan", "lessThan", "contains", "between"],
      required: true,
    },
    // String, Number, Boolean, or Array depending on `field`/`operator`
    // (e.g. [min, max] for "between", an array of ids for "contains").
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "coupon_conditions",
  }
);

couponConditionRuleSchema.index({ couponId: 1, order: 1 });

const CouponConditionRule = mongoose.model("CouponConditionRule", couponConditionRuleSchema);

module.exports = CouponConditionRule;
