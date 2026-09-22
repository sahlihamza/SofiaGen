const Coupon = require("../models/Coupon");
const CouponCondition = require("../models/CouponCondition");

const EDITABLE_FIELDS = [
  "minSpend",
  "maxSpend",
  "includedProducts",
  "excludedProducts",
  "includedCategories",
  "excludedCategories",
  "includedBrands",
  "excludedBrands",
  "includedTags",
  "excludedTags",
  "customerGroups",
  "specificCustomers",
  "guestOnly",
  "loggedUserOnly",
  "countries",
  "states",
  "cities",
  "postalCodes",
  "minQuantity",
  "maxQuantity",
  "minSubtotal",
  "maxTotalWeight",
];

class CouponConditionService {
  // Verifies the coupon exists, isn't soft-deleted, and belongs to the active
  // store before any condition read/write touches it.
  async getOwnedCoupon(couponId, storeId) {
    return await Coupon.findOne({ _id: couponId, storeId, deletedAt: null });
  }

  async getByCouponId(couponId, storeId) {
    const coupon = await this.getOwnedCoupon(couponId, storeId);
    if (!coupon) return null;

    const condition = await CouponCondition.findOne({ couponId });
    return condition || { couponId };
  }

  async upsert(couponId, storeId, data) {
    const coupon = await this.getOwnedCoupon(couponId, storeId);
    if (!coupon) return null;

    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    return await CouponCondition.findOneAndUpdate(
      { couponId },
      { $set: updates, $setOnInsert: { couponId } },
      { new: true, upsert: true, runValidators: true }
    );
  }
}

module.exports = new CouponConditionService();
