const express = require("express");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const { loadCustomerOptional, requireCustomer } = require("../middleware/customerAuth");
const { getCode } = require("../config/rbac/permissionCodes");
const returnRequestController = require("../controller/returnRequestController");

// Admin  same permission-gating shape as every other store-scoped
// resource in this project (Orders module reused: a return is a
// consequence of an order, not a separate permission surface).
const adminAuth = [isAuth, loadUser, resolveAuthorizationContext];

router.get(
  "/stores/:storeId/return-requests",
  ...adminAuth,
  requirePermission(getCode("Orders", "view")),
  returnRequestController.listReturnRequests
);
router.get(
  "/stores/:storeId/return-requests/:id",
  ...adminAuth,
  requirePermission(getCode("Orders", "view")),
  returnRequestController.getReturnRequest
);
router.post(
  "/stores/:storeId/return-requests",
  ...adminAuth,
  requirePermission(getCode("Orders", "update")),
  returnRequestController.createReturnRequest
);
router.post(
  "/stores/:storeId/return-requests/:id/approve",
  ...adminAuth,
  requirePermission(getCode("Orders", "update")),
  returnRequestController.approveReturnRequest
);
router.post(
  "/stores/:storeId/return-requests/:id/awaiting-return",
  ...adminAuth,
  requirePermission(getCode("Orders", "update")),
  returnRequestController.markAwaitingReturn
);
router.post(
  "/stores/:storeId/return-requests/:id/received",
  ...adminAuth,
  requirePermission(getCode("Orders", "update")),
  returnRequestController.markReceived
);
router.post(
  "/stores/:storeId/return-requests/:id/refund",
  ...adminAuth,
  requirePermission(getCode("Orders", "refund")),
  returnRequestController.markRefunded
);
router.post(
  "/stores/:storeId/return-requests/:id/exchange",
  ...adminAuth,
  requirePermission(getCode("Orders", "update")),
  returnRequestController.markExchanged
);
router.post(
  "/stores/:storeId/return-requests/:id/reject",
  ...adminAuth,
  requirePermission(getCode("Orders", "update")),
  returnRequestController.rejectReturnRequest
);

// Storefront  a logged-in customer filing a return on their own order.
router.post(
  "/public/return-requests",
  loadCustomerOptional,
  requireCustomer,
  returnRequestController.createCustomerReturnRequest
);

module.exports = router;
