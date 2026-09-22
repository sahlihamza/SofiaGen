const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const paymentCatalogController = require("../controller/admin/paymentCatalogController");

router.use(isAuth, loadUser, resolveAuthorizationContext);

router.get(
  "/payment-methods",
  requirePermission(getCode("Payments", "view")),
  paymentCatalogController.getPaymentMethods
);
router.post(
  "/payment-methods",
  requirePermission(getCode("Payments", "create")),
  paymentCatalogController.createPaymentMethod
);
router.get(
  "/payment-methods/:id",
  requirePermission(getCode("Payments", "view")),
  paymentCatalogController.getPaymentMethodById
);
router.put(
  "/payment-methods/:id",
  requirePermission(getCode("Payments", "update")),
  paymentCatalogController.updatePaymentMethod
);
router.delete(
  "/payment-methods/:id",
  requirePermission(getCode("Payments", "delete")),
  paymentCatalogController.deletePaymentMethod
);

router.get(
  "/payment-providers",
  requirePermission(getCode("Payments", "view")),
  paymentCatalogController.getPaymentProviders
);
router.post(
  "/payment-providers",
  requirePermission(getCode("Payments", "create")),
  paymentCatalogController.createPaymentProvider
);
router.get(
  "/payment-providers/:id",
  requirePermission(getCode("Payments", "view")),
  paymentCatalogController.getPaymentProviderById
);
router.put(
  "/payment-providers/:id",
  requirePermission(getCode("Payments", "update")),
  paymentCatalogController.updatePaymentProvider
);
router.delete(
  "/payment-providers/:id",
  requirePermission(getCode("Payments", "delete")),
  paymentCatalogController.deletePaymentProvider
);
router.post(
  "/payment-providers/:id/test-connection",
  requirePermission(getCode("Payments", "update")),
  paymentCatalogController.testProviderConnection
);

router.get(
  "/payment-methods/:id/providers",
  requirePermission(getCode("Payments", "view")),
  paymentCatalogController.getPaymentMethodProviders
);
router.post(
  "/payment-method-provider-links",
  requirePermission(getCode("Payments", "create")),
  paymentCatalogController.createPaymentMethodProviderLink
);
router.get(
  "/payment-method-provider-links",
  requirePermission(getCode("Payments", "view")),
  paymentCatalogController.getPaymentMethodProviderLinks
);
router.get(
  "/payment-method-provider-links/:id",
  requirePermission(getCode("Payments", "view")),
  paymentCatalogController.getPaymentMethodProviderLinkById
);
router.put(
  "/payment-method-provider-links/:id",
  requirePermission(getCode("Payments", "update")),
  paymentCatalogController.updatePaymentMethodProviderLink
);
router.delete(
  "/payment-method-provider-links/:id",
  requirePermission(getCode("Payments", "delete")),
  paymentCatalogController.deletePaymentMethodProviderLink
);

router.get(
  "/payment-rules",
  requirePermission(getCode("Payments", "view")),
  paymentCatalogController.getPaymentRules
);
router.post(
  "/payment-rules",
  requirePermission(getCode("Payments", "create")),
  paymentCatalogController.createPaymentRule
);
router.get(
  "/payment-rules/:id",
  requirePermission(getCode("Payments", "view")),
  paymentCatalogController.getPaymentRuleById
);
router.put(
  "/payment-rules/:id",
  requirePermission(getCode("Payments", "update")),
  paymentCatalogController.updatePaymentRule
);
router.delete(
  "/payment-rules/:id",
  requirePermission(getCode("Payments", "delete")),
  paymentCatalogController.deletePaymentRule
);

module.exports = router;
