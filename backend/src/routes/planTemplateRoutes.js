const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const planTemplateController = require("../controller/planTemplateController");

// P14  Plan Templates

// List templates
router.get("/", requirePermission(getCode("Platform Plan", "view")), planTemplateController.getPlanTemplates);

// Get one template
router.get("/:id", requirePermission(getCode("Platform Plan", "view")), planTemplateController.getPlanTemplate);

// Create a template
router.post("/", requirePermission(getCode("Platform Plan", "create")), planTemplateController.createPlanTemplate);

// Update a template
router.put("/:id", requirePermission(getCode("Platform Plan", "update")), planTemplateController.updatePlanTemplate);

// Clone a template
router.post("/:id/clone", requirePermission(getCode("Platform Plan", "create")), planTemplateController.clonePlanTemplate);

// Instantiate a template into a real Plan
router.post("/:id/instantiate", requirePermission(getCode("Platform Plan", "create")), planTemplateController.instantiatePlanTemplate);

// Delete a template
router.delete("/:id", requirePermission(getCode("Platform Plan", "delete")), planTemplateController.deletePlanTemplate);

module.exports = router;
