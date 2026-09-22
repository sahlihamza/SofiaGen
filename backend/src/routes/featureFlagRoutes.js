const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getAllFeatureFlags,
  getFeatureFlagByCode,
  createFeatureFlag,
  updateFeatureFlag,
  toggleFeatureFlagForStore,
  deleteFeatureFlag,
  getFeatureFlagsForPlan,
  getAvailableFeatures,
} = require("../controller/featureFlagController");
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");

// Feature Flags management routes
router.get("/", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "view")), getAllFeatureFlags);
router.get("/:code", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "view")), getFeatureFlagByCode);
router.post("/", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "create")), createFeatureFlag);
router.put("/:id", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "update")), updateFeatureFlag);
router.delete("/:id", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "delete")), deleteFeatureFlag);

// Feature flag operations
router.post("/:flagId/toggle/:storeId", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "update")), toggleFeatureFlagForStore);

// Plan feature flags
router.get("/plan/:planId", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "view")), getFeatureFlagsForPlan);

// Store feature flags
router.get("/store/:storeId/available", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Features", "view")), getAvailableFeatures);

module.exports = router;
