const express = require("express");
const router = express.Router();
const { hasPermission, requireStoreAccess } = require("../middleware/auth");
const {
  getSettings,
  updateSettings,
  getStatus,
  regenerateNow,
  testFeed,
  previewProduct,
} = require("../controller/facebookCatalogController");

const MODULE = "Integrations";

router.get("/:storeId/settings", requireStoreAccess(), hasPermission(MODULE, "view"), getSettings);
router.put("/:storeId/settings", requireStoreAccess(), hasPermission(MODULE, "update"), updateSettings);
router.get("/:storeId/status", requireStoreAccess(), hasPermission(MODULE, "view"), getStatus);
router.post("/:storeId/regenerate", requireStoreAccess(), hasPermission(MODULE, "update"), regenerateNow);
router.post("/:storeId/test", requireStoreAccess(), hasPermission(MODULE, "view"), testFeed);
router.get("/:storeId/preview/:productId", requireStoreAccess(), hasPermission(MODULE, "view"), previewProduct);

module.exports = router;