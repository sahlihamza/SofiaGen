const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const trialFactorController = require("../controller/trialFactorController");

router.get("/categories", trialFactorController.getTrialFactorCategories);
router.get("/", trialFactorController.getTrialFactors);
router.get("/:id", trialFactorController.getTrialFactorById);
router.post("/", trialFactorController.createTrialFactor);
router.put("/:id", trialFactorController.updateTrialFactor);
router.delete("/:id", trialFactorController.deleteTrialFactor);

module.exports = router;
