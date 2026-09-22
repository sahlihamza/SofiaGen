const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const featureController = require("../controller/featureController");
const { cleanupExpiredFeatures } = require("../jobs/featureCleanup");

router.get("/", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "view")), featureController.getFeatures);
router.get("/categories", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "view")), featureController.getFeatureCategories);
router.post("/categories", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "create")), featureController.createFeatureCategory);
router.get("/:id", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "view")), featureController.getFeatureById);
router.post("/", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "create")), featureController.createFeature);
router.put("/:id", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "update")), featureController.updateFeature);
router.delete("/:id", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "delete")), featureController.deleteFeature);

// NOUVELLE ROUTE: Trigger feature cleanup (admin only)
router.post("/admin/cleanup-deprecated", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "update")), featureController.triggerFeatureCleanup);

module.exports = router;
