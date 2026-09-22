const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requireStoreAccess, requirePermission } = require("../middleware/auth");
const {
  getSettings,
  updateOptions,
  updateTaxClasses,
  updateRates,
} = require("../controller/taxSettingsController");

const canView = requirePermission(getCode("Settings", "view"));
const canUpdate = requirePermission(getCode("Settings", "update"));

router.get("/:storeId", requireStoreAccess(), canView, getSettings);
router.put("/:storeId/options", requireStoreAccess(), canUpdate, updateOptions);
router.put("/:storeId/classes", requireStoreAccess(), canUpdate, updateTaxClasses);
router.put("/:storeId/rates/:taxClass", requireStoreAccess(), canUpdate, updateRates);

module.exports = router;
