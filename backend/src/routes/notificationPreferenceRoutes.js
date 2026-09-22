const express = require("express");
const { getCode } = require("../config/rbac/permissionCodes");
const {
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission,
} = require("../middleware/auth");
const router = express.Router();
const { getPreferences, updatePreferences } = require("../controller/notificationPreferenceController");

// Every authenticated user can read and update their own notification preferences.
// The controller enforces scoping by req.user._id and req.currentStoreId,
// as well as enforceCriticalCategories() on updates.
router.use(isAuth, loadUser, resolveAuthorizationContext);

router.get("/", requirePermission(getCode("Notifications", "view")), getPreferences);
router.put("/", requirePermission(getCode("Notifications", "update")), updatePreferences);

module.exports = router;
