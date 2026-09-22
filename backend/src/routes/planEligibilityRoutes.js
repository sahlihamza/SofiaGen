const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const planEligibilityController = require("../controller/planEligibilityController");

// P16  Plan Eligibility Rules

// Rule builder metadata
router.get("/factors", requirePermission(getCode("Platform Plan", "view")), planEligibilityController.getEligibilityFactors);
router.get("/operators", requirePermission(getCode("Platform Plan", "view")), planEligibilityController.getEligibilityOperators);

// Test / preview (no-cod rule builder)
router.post("/test", requirePermission(getCode("Platform Plan", "view")), planEligibilityController.testPlanEligibilityRule);
router.post("/preview", requirePermission(getCode("Platform Plan", "view")), planEligibilityController.previewPlanEligibilityRule);

// List rules
router.get("/", requirePermission(getCode("Platform Plan", "view")), planEligibilityController.getPlanEligibilityRules);

// Get one rule
router.get("/:id", requirePermission(getCode("Platform Plan", "view")), planEligibilityController.getPlanEligibilityRule);

// Create a rule
router.post("/", requirePermission(getCode("Platform Plan", "create")), planEligibilityController.createPlanEligibilityRule);

// Update a rule
router.put("/:id", requirePermission(getCode("Platform Plan", "update")), planEligibilityController.updatePlanEligibilityRule);

// Update status
router.patch("/:id/status", requirePermission(getCode("Platform Plan", "update")), planEligibilityController.updatePlanEligibilityRuleStatus);

// Clone a rule
router.post("/:id/clone", requirePermission(getCode("Platform Plan", "create")), planEligibilityController.clonePlanEligibilityRule);

// Commercial approval
router.post("/:id/approve", requirePermission(getCode("Platform Plan", "update")), planEligibilityController.approvePlanEligibility);

// Delete a rule
router.delete("/:id", requirePermission(getCode("Platform Plan", "delete")), planEligibilityController.deletePlanEligibilityRule);

module.exports = router;
