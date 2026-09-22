const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission, requireSuperAdmin } = require("../middleware/auth");
const planPriceController = require("../controller/planPriceController");

router.use(isAuth, loadUser, resolveAuthorizationContext, requireSuperAdmin);

// Get active prices for a plan (must be before /:id)
router.get("/active/for-plan/:planId", requirePermission(getCode("Platform Billing", "view")), planPriceController.getActivePricesForPlan);

router.get("/", requirePermission(getCode("Platform Billing", "view")), planPriceController.getPlanPrices);
router.get("/:id", requirePermission(getCode("Platform Billing", "view")), planPriceController.getPlanPriceById);
router.post("/", requirePermission(getCode("Platform Billing", "create")), planPriceController.createPlanPrice);
router.put("/:id", requirePermission(getCode("Platform Billing", "update")), planPriceController.updatePlanPrice);
router.patch("/:id/status", requirePermission(getCode("Platform Billing", "update")), planPriceController.updatePlanPriceStatus);
router.delete("/:id", requirePermission(getCode("Platform Billing", "delete")), planPriceController.deletePlanPrice);

module.exports = router;
