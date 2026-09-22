const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const planUpgradeRuleController = require("../controller/planUpgradeRuleController");

// P4  Plan Upgrade Rules

// Preview an upgrade (no write)
router.post("/preview", requirePermission(getCode("Platform Plan", "view")), planUpgradeRuleController.previewUpgrade);

// Execute an upgrade (billing strategy)
router.post("/execute", requirePermission(getCode("Platform Plan", "update")), planUpgradeRuleController.executeUpgrade);

// List rules
router.get("/", requirePermission(getCode("Platform Plan", "view")), planUpgradeRuleController.getUpgradeRules);

// Get one rule
router.get("/:id", requirePermission(getCode("Platform Plan", "view")), planUpgradeRuleController.getUpgradeRule);

// Create a rule
router.post("/", requirePermission(getCode("Platform Plan", "create")), planUpgradeRuleController.createUpgradeRule);

// Update a rule
router.put("/:id", requirePermission(getCode("Platform Plan", "update")), planUpgradeRuleController.updateUpgradeRule);

// Update status
router.patch("/:id/status", requirePermission(getCode("Platform Plan", "update")), planUpgradeRuleController.updateUpgradeRuleStatus);

// Clone a rule
router.post("/:id/clone", requirePermission(getCode("Platform Plan", "create")), planUpgradeRuleController.cloneUpgradeRule);

// Delete a rule
router.delete("/:id", requirePermission(getCode("Platform Plan", "delete")), planUpgradeRuleController.deleteUpgradeRule);

module.exports = router;
