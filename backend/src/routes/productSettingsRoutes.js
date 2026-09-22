const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requireStoreAccess, requirePermission } = require("../middleware/auth");
const {
  getProductSettings,
  updateProductSettings,
} = require("../controller/productSettingsController");

const canView = requirePermission(getCode("Settings", "view"));
const canUpdate = requirePermission(getCode("Settings", "update"));

router.get("/:storeId", requireStoreAccess(), canView, getProductSettings);
router.put("/:storeId", requireStoreAccess(), canUpdate, updateProductSettings);

module.exports = router;
