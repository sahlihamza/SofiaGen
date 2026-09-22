const mongoose = require("mongoose");

const couponConditionSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      unique: true,
    },

    // Cart value restrictions
    minSpend: { type: Number, required: false },
    maxSpend: { type: Number, required: false },

    // Product restrictions
    includedProducts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
      default: [],
    },
    excludedProducts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
      default: [],
    },
    includedCategories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Category",
      default: [],
    },
    excludedCategories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Category",
      default: [],
    },
    includedBrands: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Brand",
      default: [],
    },
    excludedBrands: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Brand",
      default: [],
    },
    includedTags: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "ProductTag",
      default: [],
    },
    excludedTags: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "ProductTag",
      default: [],
    },

    // Customer restrictions
    // Plain labels, not a ref: there is no CustomerGroup model in this app yet.
    customerGroups: {
      type: [String],
      default: [],
    },
    specificCustomers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Customer",
      default: [],
    },
    guestOnly: { type: Boolean, default: false },
    loggedUserOnly: { type: Boolean, default: false },

    // Geographic restrictions
    countries: { type: [String], default: [] },
    states: { type: [String], default: [] },
    cities: { type: [String], default: [] },
    postalCodes: { type: [String], default: [] },

    // Quantity / weight restrictions
    minQuantity: { type: Number, required: false },
    maxQuantity: { type: Number, required: false },
    minSubtotal: { type: Number, required: false },
    maxTotalWeight: { type: Number, required: false },
  },
  {
    timestamps: true,
  }
);

const CouponCondition = mongoose.model("CouponCondition", couponConditionSchema);

module.exports = CouponCondition;
