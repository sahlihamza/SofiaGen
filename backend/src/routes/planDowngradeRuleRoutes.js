const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const planDowngradeRuleController = require("../controller/planDowngradeRuleController");

// P5  Plan Downgrade Rules

// Validate a downgrade (checks quota fit, no write)
router.post("/validate", requirePermission(getCode("Platform Plan", "view")), planDowngradeRuleController.validateDowngrade);

// Execute a downgrade (applies policy)
router.post("/execute", requirePermission(getCode("Platform Plan", "update")), planDowngradeRuleController.executeDowngrade);

// List rules
router.get("/", requirePermission(getCode("Platform Plan", "view")), planDowngradeRuleController.getDowngradeRules);

// Get one rule
router.get("/:id", requirePermission(getCode("Platform Plan", "view")), planDowngradeRuleController.getDowngradeRule);

// Create a rule
router.post("/", requirePermission(getCode("Platform Plan", "create")), planDowngradeRuleController.createDowngradeRule);

// Update a rule
router.put("/:id", requirePermission(getCode("Platform Plan", "update")), planDowngradeRuleController.updateDowngradeRule);

// Update status
router.patch("/:id/status", requirePermission(getCode("Platform Plan", "update")), planDowngradeRuleController.updateDowngradeRuleStatus);

// Clone a rule
router.post("/:id/clone", requirePermission(getCode("Platform Plan", "create")), planDowngradeRuleController.cloneDowngradeRule);

// Delete a rule
router.delete("/:id", requirePermission(getCode("Platform Plan", "delete")), planDowngradeRuleController.deleteDowngradeRule);

module.exports = router;
