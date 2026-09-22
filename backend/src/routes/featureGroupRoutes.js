const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const featureGroupController = require("../controller/featureGroupController");

router.use(isAuth, loadUser, resolveAuthorizationContext);

router.get("/", requirePermission(getCode("Platform Plan", "view")), featureGroupController.getFeatureGroups);
router.get("/:id", requirePermission(getCode("Platform Plan", "view")), featureGroupController.getFeatureGroupById);
router.post("/", requirePermission(getCode("Platform Plan", "create")), featureGroupController.createFeatureGroup);
router.put("/:id", requirePermission(getCode("Platform Plan", "update")), featureGroupController.updateFeatureGroup);
router.delete("/:id", requirePermission(getCode("Platform Plan", "delete")), featureGroupController.deleteFeatureGroup);

module.exports = router;
