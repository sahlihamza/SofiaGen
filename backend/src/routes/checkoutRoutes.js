const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const { loadCustomerOptional } = require("../middleware/customerAuth");
const {
  getCheckout,
  validateCheckout,
  placeOrder,
  getOrderConfirmation,
} = require("../controller/checkoutController");

// The checkout serves guests too, so the customer token is optional  but it
// has to be read, since every handler below works off req.customer.
router.use(loadCustomerOptional);

// Checkout context: addresses, delivery options, payment methods, settings.
router.get("/", getCheckout);

// Re-checks stock, prices, coupon, carrier and addresses without creating
// anything.
router.post("/validate", validateCheckout);

// Creates the order, reserves the stock and starts the payment.
router.post("/place-order", placeOrder);

// Confirmation page, reachable by guests with the order e-mail.
router.get("/order/:id", getOrderConfirmation);

module.exports = router;
