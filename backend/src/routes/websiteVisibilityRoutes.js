const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { hasPermission, requireStoreAccess } = require("../middleware/auth");
const {
  getSettings,
  updateSettings,
  resetSessions,
  previewMode,
} = require("../controller/websiteVisibilityController");
const MODULE = "Website Visibility";

router.get("/:storeId", requireStoreAccess(), hasPermission(MODULE, "view"), getSettings);
router.put("/:storeId", requireStoreAccess(), hasPermission(MODULE, "update"), updateSettings);
router.post(
  "/:storeId/reset-sessions",
  requireStoreAccess(),
  hasPermission(MODULE, "update"),
  resetSessions
);
router.get("/:storeId/preview", requireStoreAccess(), hasPermission(MODULE, "preview"), previewMode);

module.exports = router;
