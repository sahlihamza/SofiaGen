const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getSettings,
  updateSettings,
  getPasswordPolicy,
  updatePasswordPolicy,
  getEmailHealth,
  sendPlatformEmailTest,
  getEmailQueueStats,
  getPlatformSmtp,
  updatePlatformSmtp,
  testPlatformSmtp,
} = require("../controller/platformSettingsController");
const {
  isAuth,
  loadUser, resolveAuthorizationContext, requirePermission,
  requireSuperAdmin,
} = require("../middleware/auth");

router.use(isAuth, loadUser, resolveAuthorizationContext, requireSuperAdmin);

router.get("/", requirePermission(getCode("Platform Settings", "view")), getSettings);
router.put("/", requirePermission(getCode("Platform Settings", "update")), updateSettings);
router.get("/password-policy", requirePermission(getCode("Platform Settings", "view")), getPasswordPolicy);
router.put("/password-policy", requirePermission(getCode("Platform Settings", "update")), updatePasswordPolicy);

// Platform email (MAIL-03)  identity only (PlatformSettings.email), never
// credentials (SMTP_* env vars only, see EmailTransportFactory). The test
// send has its own permission, distinct from platform.settings.update: an
// operator could be allowed to send a one-off test without being able to
// change the platform's actual send identity.
router.get("/email/health", requirePermission(getCode("Platform Settings", "view")), getEmailHealth);
router.post("/email/test", requirePermission(getCode("Platform Email", "test")), sendPlatformEmailTest);
// Basic per-type/channel/status counts of queued sends (MAIL-04)  no
// recipient list, no bodies, just counts.
router.get("/email/queue/stats", requirePermission(getCode("Platform Settings", "view")), getEmailQueueStats);

// MAIL-Platform  platform SMTP configuration (Super Admin UI).
// requireSuperAdmin is already applied at router level; these explicit
// permission checks keep the RBAC contract uniform with the rest of the file.
router.get("/smtp", requirePermission(getCode("Platform Settings", "view")), getPlatformSmtp);
router.put("/smtp", requirePermission(getCode("Platform Settings", "update")), updatePlatformSmtp);
// Test uses the FORM values handed in the body (never the stored config), so
// an admin can validate credentials before saving anything.
router.post("/smtp/test", requirePermission(getCode("Platform Settings", "update")), testPlatformSmtp);

module.exports = router;
