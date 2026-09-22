const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requireStoreAccess, requirePermission } = require("../middleware/auth");
const {
  getSettings,
  updateSettings,
} = require("../controller/pointOfSaleSettingsController");

const canView = requirePermission(getCode("Settings", "view"));
const canUpdate = requirePermission(getCode("Settings", "update"));

router.get("/:storeId", requireStoreAccess(), canView, getSettings);
router.put("/:storeId", requireStoreAccess(), canUpdate, updateSettings);

module.exports = router;
