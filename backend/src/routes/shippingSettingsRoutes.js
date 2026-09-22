const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requireStoreAccess, requirePermission } = require("../middleware/auth");
const {
  getShippingSettings,
  updateShippingSettings,
} = require("../controller/shippingSettingsController");

const canView = requirePermission(getCode("Settings", "view"));
const canUpdate = requirePermission(getCode("Settings", "update"));

router.get("/:storeId", requireStoreAccess(), canView, getShippingSettings);
router.put("/:storeId", requireStoreAccess(), canUpdate, updateShippingSettings);

module.exports = router;
