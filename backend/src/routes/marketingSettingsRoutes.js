const express = require("express");
const { requireStoreAccess, requirePermission } = require("../middleware/auth");
const { getCode } = require("../config/rbac/permissionCodes");
const {
  getMarketingSettings,
  updateMarketingSettings,
  testMetaConnection,
  testGa4Connection,
} = require("../controller/marketingSettingsController");

const router = express.Router();

const canView = requirePermission(getCode("Marketing", "view"));
const canUpdate = requirePermission(getCode("Marketing", "update"));
const canTest = requirePermission(getCode("Marketing", "test"));

router.get("/:storeId", requireStoreAccess(), canView, getMarketingSettings);
router.put("/:storeId", requireStoreAccess(), canUpdate, updateMarketingSettings);
router.post("/:storeId/meta/test", requireStoreAccess(), canTest, testMetaConnection);
router.post("/:storeId/ga4/test", requireStoreAccess(), canTest, testGa4Connection);

module.exports = router;