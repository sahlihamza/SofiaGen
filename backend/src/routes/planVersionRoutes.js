const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const planVersionController = require("../controller/planVersionController");

// P13  Plan Versioning (snapshot / rollback)

// List versions for a plan
router.get("/plans/:planId/versions", requirePermission(getCode("Platform Plan", "view")), planVersionController.getPlanVersions);

// Get a specific version
router.get("/plans/:planId/versions/:version", requirePermission(getCode("Platform Plan", "view")), planVersionController.getPlanVersion);

// Manually create a snapshot
router.post("/plans/:planId/versions", requirePermission(getCode("Platform Plan", "update")), planVersionController.createPlanVersion);

// Rollback plan to a version
router.post("/plans/:planId/versions/:version/rollback", requirePermission(getCode("Platform Plan", "update")), planVersionController.rollbackPlanVersion);

// Delete a version
router.delete("/versions/:id", requirePermission(getCode("Platform Plan", "delete")), planVersionController.deletePlanVersion);

module.exports = router;
