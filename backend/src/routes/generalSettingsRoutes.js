const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getGeneralSettings,
  updateGeneralSettings,
} = require("../controller/generalSettingsController");
const { isAuth, loadUser, requirePermission, validateStoreAccess } = require("../middleware/auth");

router.get("/:storeId", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Settings", "view")), getGeneralSettings);
router.put("/:storeId", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Settings", "update")), updateGeneralSettings);

module.exports = router;
