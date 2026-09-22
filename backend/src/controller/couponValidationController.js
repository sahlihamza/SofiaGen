const couponValidationService = require("../service/couponValidationService");
const couponCalculationService = require("../service/couponCalculationService");
const couponUsageService = require("../service/couponUsageService");
const { resolveStoreId } = require("../utils/requestContext");

// Shared by validate/apply: builds the couponValidationService context from
// a request body. `appliedCoupons` (Story 9) is an array of coupons already
// applied to this same cart, e.g. [{ stackable: false }, ...]  the caller
// (frontend cart state) is the only place that knows what's already applied.
const buildContext = (body, storeId) => {
  const {
    cartItems,
    cartSubtotal,
    cartTotalWeight,
    customerId,
    isGuest,
    customerCountry,
    customerState,
    customerCity,
    customerPostalCode,
    customerGroup,
    customerFirstOrder,
    customerBirthday,
    customerRegistrationDate,
    appliedCoupons,
  } = body;

  return {
    storeId,
    cartItems: cartItems || [],
    cartSubtotal: cartSubtotal || 0,
    cartTotalWeight,
    customerId,
    isGuest: isGuest ?? !customerId,
    customerCountry,
    customerState,
    customerCity,
    customerPostalCode,
    customerGroup,
    customerFirstOrder,
    customerBirthday,
    customerRegistrationDate,
    appliedCoupons: appliedCoupons || [],
  };
};

// Checks a coupon and computes what it would discount, WITHOUT recording
// any usage  safe to call repeatedly while the customer is still shopping.
const validateAndCalculate = async (req, res) => {
  try {
    const storeId = resolveStoreId(req);
    const context = buildContext(req.body, storeId);

    const result = await couponValidationService.validateCoupon(req.body.code, context);
    if (!result.valid) {
      return res.status(200).json(result);
    }

    const discount = await couponCalculationService.calculateDiscount(
      result.coupon,
      context.cartItems,
      context.cartSubtotal
    );

    return res.status(200).json({
      valid: true,
      coupon: result.coupon,
      ...discount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

// Same validation + calculation as above, but when an orderId is supplied
// (i.e. this is a real order being placed, not a cart preview) it also
// records the usage  atomically bumping Coupon.usedCount (Phase 4).
const applyCoupon = async (req, res) => {
  try {
    const storeId = resolveStoreId(req);
    const context = buildContext(req.body, storeId);
    const { orderId } = req.body;

    const result = await couponValidationService.validateCoupon(req.body.code, context);
    if (!result.valid) {
      return res.status(200).json({ success: false, ...result });
    }

    const discount = await couponCalculationService.calculateDiscount(
      result.coupon,
      context.cartItems,
      context.cartSubtotal
    );

    let usage = null;
    if (orderId) {
      if (!context.customerId) {
        return res.status(400).json({
          success: false,
          code: "CUSTOMER_ID_REQUIRED",
          message: "customerId est requis pour enregistrer l'utilisation d'un coupon sur une commande.",
        });
      }
      usage = await couponUsageService.recordUsage(
        storeId,
        result.coupon._id,
        context.customerId,
        orderId,
        discount.discount
      );
    }

    return res.status(200).json({
      success: true,
      coupon: result.coupon,
      discount,
      usage,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

// Reverses a previously recorded usage (order cancelled, coupon removed
// from cart after checkout, etc.)  atomically decrements Coupon.usedCount.
const removeCoupon = async (req, res) => {
  try {
    const { usageId } = req.body;
    if (!usageId) {
      return res.status(400).json({ success: false, message: "usageId est requis." });
    }

    const usage = await couponUsageService.cancelUsage(usageId);
    if (!usage) {
      return res
        .status(404)
        .json({ success: false, message: "Utilisation introuvable ou déjà annulée." });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  validateAndCalculate,
  applyCoupon,
  removeCoupon,
};

