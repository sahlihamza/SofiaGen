const mongoose = require("mongoose");

// Story 6: groups CouponConditionRule documents under a single AND/OR
// operator (e.g. customerGroup=VIP AND cartTotal>200).
const couponRuleGroupSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    logicOperator: {
      type: String,
      enum: ["AND", "OR"],
      default: "AND",
    },
    conditionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "CouponConditionRule",
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "coupon_rules",
  }
);

couponRuleGroupSchema.index({ couponId: 1 });

const CouponRuleGroup = mongoose.model("CouponRuleGroup", couponRuleGroupSchema);

module.exports = CouponRuleGroup;
