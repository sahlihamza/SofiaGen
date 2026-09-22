const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requireStoreAccess, requirePermission } = require("../middleware/auth");
const {
  getPaymentSettings,
  updatePaymentSettings,
  togglePaymentMethod,
  reorderPaymentMethods,
} = require("../controller/paymentSettingsController");

const canView = requirePermission(getCode("Settings", "view"));
const canUpdate = requirePermission(getCode("Settings", "update"));

router.get("/:storeId", requireStoreAccess(), canView, getPaymentSettings);
router.put("/:storeId", requireStoreAccess(), canUpdate, updatePaymentSettings);
router.patch("/:storeId/reorder", requireStoreAccess(), canUpdate, reorderPaymentMethods);
router.patch("/:storeId/methods/:key/toggle", requireStoreAccess(), canUpdate, togglePaymentMethod);

module.exports = router;
