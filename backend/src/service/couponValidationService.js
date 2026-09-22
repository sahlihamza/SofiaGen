const Coupon = require("../models/Coupon");
const CouponCondition = require("../models/CouponCondition");
const couponUsageService = require("./couponUsageService");
const couponRuleService = require("./couponRuleService");

const fail = (code, message) => ({ valid: false, code, message });

const toIdString = (value) => (value === undefined || value === null ? undefined : String(value));

const includesId = (list, id) => {
  const idStr = toIdString(id);
  if (idStr === undefined) return false;
  return (list || []).map(String).includes(idStr);
};

const anyIncludesId = (list, ids) => (ids || []).some((id) => includesId(list, id));

class CouponValidationService {
  // Steps 1-3: existence, status, and date-window checks. Kept separate from
  // the restriction checks below because they only need the Coupon document.
  checkStatusAndDates(coupon) {
    if (coupon.status === "archived") return fail("COUPON_ARCHIVED", "Ce coupon est archivé.");
    if (coupon.status === "inactive") return fail("COUPON_INACTIVE", "Ce coupon est inactif.");

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return fail("COUPON_NOT_STARTED", "Ce coupon n'est pas encore valide.");
    }
    if (coupon.endDate && now > coupon.endDate) {
      return fail("COUPON_EXPIRED", "Ce coupon a expiré.");
    }
    return null;
  }

  // Steps 4-5: global and per-customer usage limits. The global counter lives
  // directly on the Coupon document (Coupon.usedCount), kept in sync
  // atomically by couponUsageService.recordUsage/cancelUsage (Phase 4)  no
  // need to re-count the coupon_usages collection here. The per-customer
  // limit does need a live count from that collection.
  async checkUsageLimits(coupon, context) {
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
      if (coupon.usedCount >= coupon.usageLimit) {
        return fail("USAGE_LIMIT_REACHED", "Ce coupon a atteint sa limite d'utilisation.");
      }
    }

    if (
      coupon.usageLimitPerCustomer !== null &&
      coupon.usageLimitPerCustomer !== undefined &&
      context.customerId
    ) {
      const count = await couponUsageService.getUsageCountForCustomer(coupon._id, context.customerId);
      if (count >= coupon.usageLimitPerCustomer) {
        return fail(
          "CUSTOMER_USAGE_LIMIT_REACHED",
          "Vous avez déjà utilisé ce coupon le nombre maximum de fois autorisé."
        );
      }
    }

    return null;
  }

  // Story 9: stackability. `context.appliedCoupons` is the list of coupons
  // already applied to this same cart (plain objects/documents with at
  // least a `stackable` boolean), supplied by the caller  this service has
  // no notion of "cart state" on its own. A non-stackable coupon must be the
  // only coupon on the cart, in either direction: it can't be added on top
  // of an existing one, and nothing can be added on top of it.
  checkStackability(coupon, context) {
    const applied = context.appliedCoupons || [];
    if (applied.length === 0) return null;

    if (!coupon.stackable) {
      return fail(
        "COUPON_NOT_STACKABLE",
        "Ce coupon ne peut pas être combiné avec un autre coupon déjà appliqué."
      );
    }
    if (applied.some((c) => c.stackable === false)) {
      return fail(
        "EXISTING_COUPON_NOT_STACKABLE",
        "Un coupon déjà appliqué  ce panier ne peut pas être combiné avec un autre."
      );
    }
    return null;
  }

  // Step 6: who is allowed to use this coupon at all.
  checkCustomerEligibility(condition, context) {
    if (condition.guestOnly && !context.isGuest) {
      return fail("GUEST_ONLY", "Ce coupon est rûrervé aux visiteurs non connectés.");
    }
    if (condition.loggedUserOnly && context.isGuest) {
      return fail("LOGIN_REQUIRED", "Vous devez être connecté pour utiliser ce coupon.");
    }
    if (condition.specificCustomers?.length) {
      if (!context.customerId || !includesId(condition.specificCustomers, context.customerId)) {
        return fail("CUSTOMER_NOT_ELIGIBLE", "Ce coupon n'est pas disponible pour votre compte.");
      }
    }
    if (condition.customerGroups?.length) {
      if (!context.customerGroup || !condition.customerGroups.includes(context.customerGroup)) {
        return fail("CUSTOMER_GROUP_NOT_ELIGIBLE", "Ce coupon n'est pas disponible pour votre groupe de clients.");
      }
    }
    return null;
  }

  // Step 7: minSpend/minSubtotal/maxSpend against the cart subtotal.
  checkAmountRestrictions(condition, context) {
    const subtotal = context.cartSubtotal || 0;

    if (condition.minSpend != null && subtotal < condition.minSpend) {
      return fail("MIN_SPEND_NOT_MET", `Le panier doit atteindre au moins ${condition.minSpend}.`);
    }
    if (condition.minSubtotal != null && subtotal < condition.minSubtotal) {
      return fail("MIN_SPEND_NOT_MET", `Le panier doit atteindre au moins ${condition.minSubtotal}.`);
    }
    if (condition.maxSpend != null && subtotal > condition.maxSpend) {
      return fail("MAX_SPEND_EXCEEDED", `Le panier ne doit pas dépasser ${condition.maxSpend}.`);
    }
    return null;
  }

  // Step 8: included/excluded products, categories, brands, tags. Each
  // dimension is independent: an exclusion list blocks any match, an
  // inclusion list requires at least one match *within that same cart*.
  checkProductRestrictions(condition, context) {
    const cartItems = context.cartItems || [];
    const productIds = cartItems.map((i) => i.productId);
    const categoryIds = cartItems.map((i) => i.categoryId);
    const brandIds = cartItems.map((i) => i.brandId);
    const tagIds = cartItems.flatMap((i) => i.tagIds || []);

    if (condition.excludedProducts?.length && anyIncludesId(condition.excludedProducts, productIds)) {
      return fail("EXCLUDED_PRODUCT_IN_CART", "Le panier contient un produit exclu de ce coupon.");
    }
    if (condition.excludedCategories?.length && anyIncludesId(condition.excludedCategories, categoryIds)) {
      return fail("EXCLUDED_CATEGORY_IN_CART", "Le panier contient un produit d'une catégorie exclue.");
    }
    if (condition.excludedBrands?.length && anyIncludesId(condition.excludedBrands, brandIds)) {
      return fail("EXCLUDED_BRAND_IN_CART", "Le panier contient un produit d'une marque exclue.");
    }
    if (condition.excludedTags?.length && anyIncludesId(condition.excludedTags, tagIds)) {
      return fail("EXCLUDED_TAG_IN_CART", "Le panier contient un produit avec un tag exclu.");
    }

    if (condition.includedProducts?.length && !anyIncludesId(condition.includedProducts, productIds)) {
      return fail("PRODUCT_RESTRICTION_NOT_MET", "Le panier ne contient aucun produit éligible  ce coupon.");
    }
    if (condition.includedCategories?.length && !anyIncludesId(condition.includedCategories, categoryIds)) {
      return fail("CATEGORY_RESTRICTION_NOT_MET", "Le panier ne contient aucun produit d'une catégorie éligible.");
    }
    if (condition.includedBrands?.length && !anyIncludesId(condition.includedBrands, brandIds)) {
      return fail("BRAND_RESTRICTION_NOT_MET", "Le panier ne contient aucun produit d'une marque éligible.");
    }
    if (condition.includedTags?.length && !anyIncludesId(condition.includedTags, tagIds)) {
      return fail("TAG_RESTRICTION_NOT_MET", "Le panier ne contient aucun produit avec un tag éligible.");
    }

    return null;
  }

  // Step 9: geographic restrictions. Only `customerCountry` is part of the
  // documented validateCoupon context; state/city/postalCode are checked
  // defensively if the caller happens to supply them, but a configured
  // restriction is never enforced against a field the caller didn't send 
  // there is simply no signal to check it against yet.
  checkGeoRestrictions(condition, context) {
    if (condition.countries?.length) {
      if (!context.customerCountry || !condition.countries.includes(context.customerCountry)) {
        return fail("COUNTRY_NOT_ELIGIBLE", "Ce coupon n'est pas disponible dans votre pays.");
      }
    }
    if (condition.states?.length && context.customerState) {
      if (!condition.states.includes(context.customerState)) {
        return fail("STATE_NOT_ELIGIBLE", "Ce coupon n'est pas disponible dans votre région.");
      }
    }
    if (condition.cities?.length && context.customerCity) {
      if (!condition.cities.includes(context.customerCity)) {
        return fail("CITY_NOT_ELIGIBLE", "Ce coupon n'est pas disponible dans votre ville.");
      }
    }
    if (condition.postalCodes?.length && context.customerPostalCode) {
      if (!condition.postalCodes.includes(context.customerPostalCode)) {
        return fail("POSTAL_CODE_NOT_ELIGIBLE", "Ce coupon n'est pas disponible pour votre code postal.");
      }
    }
    return null;
  }

  // Step 10: cart-level quantity/weight restrictions.
  checkCartRestrictions(condition, context) {
    const totalQuantity = (context.cartItems || []).reduce((sum, i) => sum + (i.quantity || 0), 0);

    if (condition.minQuantity != null && totalQuantity < condition.minQuantity) {
      return fail("MIN_QUANTITY_NOT_MET", `Le panier doit contenir au moins ${condition.minQuantity} article(s).`);
    }
    if (condition.maxQuantity != null && totalQuantity > condition.maxQuantity) {
      return fail("MAX_QUANTITY_EXCEEDED", `Le panier ne doit pas dépasser ${condition.maxQuantity} article(s).`);
    }
    if (condition.maxTotalWeight != null && (context.cartTotalWeight || 0) > condition.maxTotalWeight) {
      return fail("MAX_WEIGHT_EXCEEDED", `Le poids du panier dépasse la limite de ${condition.maxTotalWeight}.`);
    }
    return null;
  }

  // Builds the context shape couponRuleService.evaluateRules() (Phase 3)
  // expects from the richer validateCoupon() context.
  toRuleContext(context) {
    return {
      cartTotal: context.cartSubtotal,
      customerGroup: context.customerGroup,
      productCategories: (context.cartItems || []).map((i) => i.categoryId).filter(Boolean),
      productBrands: (context.cartItems || []).map((i) => i.brandId).filter(Boolean),
      productIds: (context.cartItems || []).map((i) => i.productId).filter(Boolean),
      customerFirstOrder: context.customerFirstOrder,
      customerBirthday: context.customerBirthday,
      customerRegistrationDate: context.customerRegistrationDate,
      country: context.customerCountry,
    };
  }

  /**
   * Central checkout-time gate, reused as-is by Phase 6 (apply/remove API).
   *
   * @param {string} code - coupon code, case-insensitive
   * @param {object} context
   * @param {string} context.storeId
   * @param {string} [context.customerId]
   * @param {boolean} [context.isGuest]
   * @param {Array<{productId, categoryId, brandId, tagIds, quantity, price}>} context.cartItems
   * @param {number} context.cartSubtotal
   * @param {number} [context.cartTotalWeight]
   * @param {string} [context.customerCountry]
   * @param {string} [context.customerGroup]
   * @param {boolean} [context.customerFirstOrder]
   * @param {string|Date} [context.customerBirthday]
   * @param {string|Date} [context.customerRegistrationDate]
   * @param {Array<{stackable: boolean}>} [context.appliedCoupons] - coupons
   *   already applied to this cart, for Story 9 stackability checks
   * @returns {Promise<{valid: true, coupon} | {valid: false, code: string, message: string}>}
   */
  async validateCoupon(code, context = {}) {
    // Step 1: existence, scoped to the calling store  deliberately queries
    // Coupon directly with context.storeId rather than going through
    // couponService/couponConditionService's storeId-parameter-based
    // ownership check, since validation must work for whichever store the
    // checkout belongs to, not just whichever store happens to be flagged
    // "active" in the admin panel.
    const coupon = await Coupon.findOne({
      storeId: context.storeId,
      code: String(code || "").trim().toUpperCase(),
      deletedAt: null,
    });
    if (!coupon) return fail("COUPON_NOT_FOUND", "Ce code promo est introuvable.");

    // Step 2-3
    const statusError = this.checkStatusAndDates(coupon);
    if (statusError) return statusError;

    // Step 4-5
    const usageError = await this.checkUsageLimits(coupon, context);
    if (usageError) return usageError;

    // Story 9
    const stackError = this.checkStackability(coupon, context);
    if (stackError) return stackError;

    // Steps 6-10 all read from the same CouponCondition document (Phase 2).
    // Fetched directly (not via couponConditionService) for the same
    // store-scoping reason as step 1 above.
    const condition = (await CouponCondition.findOne({ couponId: coupon._id })) || {};

    const customerError = this.checkCustomerEligibility(condition, context);
    if (customerError) return customerError;

    const amountError = this.checkAmountRestrictions(condition, context);
    if (amountError) return amountError;

    const productError = this.checkProductRestrictions(condition, context);
    if (productError) return productError;

    const geoError = this.checkGeoRestrictions(condition, context);
    if (geoError) return geoError;

    const cartError = this.checkCartRestrictions(condition, context);
    if (cartError) return cartError;

    // Step 11: Phase 3 advanced rule groups.
    const rulesPass = await couponRuleService.evaluateRules(coupon._id, this.toRuleContext(context));
    if (!rulesPass) {
      return fail("RULES_NOT_SATISFIED", "Ce coupon ne s'applique pas à votre situation actuelle.");
    }

    return { valid: true, coupon };
  }
}

module.exports = new CouponValidationService();
