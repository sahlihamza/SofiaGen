const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const { loadCustomerOptional } = require("../middleware/customerAuth");
const {
  getCurrentWishlist,
  addItem,
  updateItemQuantity,
  removeItem,
  clearWishlist,
  mergeWishlist,
} = require("../controller/wishlistController");

// Public storefront endpoints  no staff auth (see src/routes.js). A shopper
// saves products long before they have an account, so the customer token is
// optional: when it is there the wishlist belongs to that customer, otherwise
// to the anonymous session the browser carries.
router.use(loadCustomerOptional);

router.get("/current", getCurrentWishlist);

router.post("/items", addItem);
router.put("/items/:itemId", updateItemQuantity);
router.delete("/items/:itemId", removeItem);

router.post("/clear", clearWishlist);

// Folds the guest wishlist into the customer's own, once, right after a login.
router.post("/merge", mergeWishlist);

module.exports = router;
