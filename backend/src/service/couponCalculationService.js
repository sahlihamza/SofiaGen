const CouponCondition = require("../models/CouponCondition");

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const toIdString = (value) => (value === undefined || value === null ? undefined : String(value));

const includesId = (list, id) => {
  const idStr = toIdString(id);
  if (idStr === undefined) return false;
  return (list || []).map(String).includes(idStr);
};

class CouponCalculationService {
  // An item is "eligible" for the discount when it isn't excluded, and (if
  // an inclusion list is configured for that dimension) matches it. No
  // restrictions at all -> every item is eligible.
  isItemEligible(condition, item) {
    if (includesId(condition.excludedProducts, item.productId)) return false;
    if (includesId(condition.excludedCategories, item.categoryId)) return false;
    if (includesId(condition.excludedBrands, item.brandId)) return false;
    if ((item.tagIds || []).some((tagId) => includesId(condition.excludedTags, tagId))) return false;

    if (condition.includedProducts?.length && !includesId(condition.includedProducts, item.productId)) {
      return false;
    }
    if (condition.includedCategories?.length && !includesId(condition.includedCategories, item.categoryId)) {
      return false;
    }
    if (condition.includedBrands?.length && !includesId(condition.includedBrands, item.brandId)) {
      return false;
    }
    if (
      condition.includedTags?.length &&
      !(item.tagIds || []).some((tagId) => includesId(condition.includedTags, tagId))
    ) {
      return false;
    }

    return true;
  }

  hasProductRestrictions(condition) {
    return Boolean(
      condition.includedProducts?.length ||
        condition.excludedProducts?.length ||
        condition.includedCategories?.length ||
        condition.excludedCategories?.length ||
        condition.includedBrands?.length ||
        condition.excludedBrands?.length ||
        condition.includedTags?.length ||
        condition.excludedTags?.length
    );
  }

  /**
   * Computes the discount for a coupon that has already passed
   * couponValidationService.validateCoupon(). Reused as-is by Phase 6
   * (apply/remove API) once the cart/checkout flow exists.
   *
   * @param {object} coupon - a Coupon document (discountType, amount, allowFreeShipping)
   * @param {Array<{productId, categoryId, brandId, tagIds, quantity, price}>} cartItems
   * @param {number} cartSubtotal
   * @returns {Promise<{subtotal: number, discount: number, shippingDiscount: number|null, tax: number, grandTotal: number}>}
   */
  async calculateDiscount(coupon, cartItems, cartSubtotal) {
    const condition = (await CouponCondition.findOne({ couponId: coupon._id })) || {};
    const items = cartItems || [];
    const subtotal = cartSubtotal || 0;

    const eligibleItems = items.filter((item) => this.isItemEligible(condition, item));
    const eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
    const eligibleQuantity = eligibleItems.reduce((sum, i) => sum + (i.quantity || 0), 0);

    let discount = 0;

    switch (coupon.discountType) {
      case "percentage": {
        // With product restrictions configured, the percentage only applies
        // to the eligible items' subtotal, not the whole cart.
        const base = this.hasProductRestrictions(condition) ? eligibleSubtotal : subtotal;
        discount = round2((base * coupon.amount) / 100);
        break;
      }
      case "fixed_cart": {
        // A flat amount off the whole cart  can never exceed the subtotal.
        discount = Math.min(coupon.amount, subtotal);
        break;
      }
      case "fixed_product": {
        // A flat amount off *each* eligible unit in the cart.
        discount = Math.min(coupon.amount * eligibleQuantity, subtotal);
        break;
      }
      case "buy_x_get_y":
      case "free_gift":
      case "shipping_discount":
        // TODO: not implemented yet  per the ticket these discount types
        // are only enabled in a future version. Skeleton only for now.
        discount = 0;
        break;
      default:
        discount = 0;
    }

    discount = round2(Math.max(0, Math.min(discount, subtotal)));

    // The actual shipping fee isn't known at this layer (calculateDiscount
    // only receives cart items/subtotal, no shipping method/cost)  null
    // signals "shipping should be waived, exact amount computed by the
    // caller", as opposed to 0 which would read as "no shipping discount".
    const shippingDiscount = coupon.allowFreeShipping ? null : 0;

    // TODO: no tax calculation engine exists yet in this project (only an
    // `enableTaxes` flag on GeneralSettings and a `taxStatus`/`taxClass` on
    // Product, no rate lookup or computation)  always 0 until one is built.
    const tax = 0;

    const grandTotal = round2(Math.max(0, subtotal - discount + tax));

    return { subtotal, discount, shippingDiscount, tax, grandTotal };
  }
}

module.exports = new CouponCalculationService();
