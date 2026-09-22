const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const { loadCustomerOptional } = require("../middleware/customerAuth");
const {
  getCurrentCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  mergeCart,
} = require("../controller/cartController");

// Public storefront endpoints  no staff auth (see src/routes.js). A shopper
// fills a cart long before they have an account, so the customer token is
// optional: when it is there the cart belongs to that customer, otherwise to
// the anonymous session the browser carries.
router.use(loadCustomerOptional);

router.get("/current", getCurrentCart);

router.post("/items", addItem);
router.put("/items/:itemId", updateItemQuantity);
router.delete("/items/:itemId", removeItem);

router.post("/clear", clearCart);

router.post("/coupons", applyCoupon);
router.delete("/coupons/:couponId", removeCoupon);

// Folds the guest cart into the customer's own, once, right after a login.
router.post("/merge", mergeCart);

module.exports = router;
