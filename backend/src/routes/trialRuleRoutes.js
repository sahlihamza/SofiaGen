const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const trialRuleController = require("../controller/trialRuleController");

// Public action types for the rule builder
router.get("/action-types", trialRuleController.getTrialActionTypes);

// Rule CRUD
router.get("/", trialRuleController.getTrialRules);
router.get("/:id", trialRuleController.getTrialRuleById);
router.post("/", trialRuleController.createTrialRule);
router.put("/:id", trialRuleController.updateTrialRule);
router.delete("/:id", trialRuleController.deleteTrialRule);
router.patch("/:id/status", trialRuleController.updateTrialRuleStatus);

// Rule Builder
router.post("/:id/clone", trialRuleController.cloneTrialRule);
router.post("/test", trialRuleController.testTrialRule);
router.post("/preview", trialRuleController.previewTrialRule);

module.exports = router;
