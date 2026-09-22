const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requireStoreAccess, requirePermission } = require("../middleware/auth");
const {
  getEmailSettings,
  updateEmailSettings,
  toggleEmailNotification,
  getEmailTemplate,
  updateEmailTemplate,
  previewEmailNotification,
  sendTestEmailNotification,
  getSmtpSettings,
  updateSmtpSettings,
  sendSmtpTestEmail,
} = require("../controller/emailSettingsController");

// Every route here takes :storeId straight from the URL  requireStoreAccess
// confirms the caller actually belongs to that store (platform mount only
// adds isAuth/loadUser/resolveAuthorizationContext, see routes.js), and
// requirePermission gates by the "settings" module the same way the rest of
// the settings surface does. Without this, any authenticated user could
// read or rewrite another store's email settings  including, before
// MAIL-02, its SMTP credentials  by just changing the :storeId in the URL.
const canView = requirePermission(getCode("Settings", "view"));
const canUpdate = requirePermission(getCode("Settings", "update"));

router.get("/:storeId/template", requireStoreAccess(), canView, getEmailTemplate);
router.put("/:storeId/template", requireStoreAccess(), canUpdate, updateEmailTemplate);
router.post("/:storeId/notifications/:key/preview", requireStoreAccess(), canView, previewEmailNotification);
router.post("/:storeId/notifications/:key/test", requireStoreAccess(), canUpdate, sendTestEmailNotification);

// Store SMTP (MAIL-02)  kept under the same :storeId param so
// requireStoreAccess resolves the same way as every other route here.
router.get("/:storeId/smtp", requireStoreAccess(), canView, getSmtpSettings);
router.put("/:storeId/smtp", requireStoreAccess(), canUpdate, updateSmtpSettings);
router.post("/:storeId/smtp/test", requireStoreAccess(), canUpdate, sendSmtpTestEmail);

router.get("/:storeId", requireStoreAccess(), canView, getEmailSettings);
router.put("/:storeId", requireStoreAccess(), canUpdate, updateEmailSettings);
router.patch("/:storeId/notifications/:key/toggle", requireStoreAccess(), canUpdate, toggleEmailNotification);

module.exports = router;
