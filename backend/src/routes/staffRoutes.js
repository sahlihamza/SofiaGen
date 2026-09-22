const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getStaffList,
  getStaffMember,
  assignRole,
  removeRole,
  addToTeam,
  removeFromTeam,
  suspendStaff,
  activateStaff,
  revokeSessions,
  getEffectivePermissions,
} = require("../controller/staffController");
const {
  isAuth,
  loadUser, resolveAuthorizationContext, requirePermission,
} = require("../middleware/auth");

router.use(isAuth, loadUser, resolveAuthorizationContext);

// Platform Staff Management is a specialized VIEW of platform user management.
// It reuses UserManagementService and only surfaces users with platform
// access (isSuperAdmin OR at least one platform-scoped role).
//
// This is NOT store-level staff. Store staff is managed through UserStore
// assignments within each store context.
//
// Permission codes intentionally reuse the existing platform.user.* and
// platform.team.* codes instead of introducing duplicate platform.staff.* codes.
router.get("/", requirePermission(getCode("Platform User", "view")), getStaffList);
router.get("/:userId", requirePermission(getCode("Platform User", "view")), getStaffMember);
router.post("/:userId/roles", requirePermission(getCode("Platform User", "update")), assignRole);
router.delete("/:userId/roles/:roleId", requirePermission(getCode("Platform User", "update")), removeRole);
router.post("/:userId/teams", requirePermission(getCode("Platform Team", "members_manage")), addToTeam);
router.delete("/:userId/teams/:teamId", requirePermission(getCode("Platform Team", "members_manage")), removeFromTeam);
router.post("/:userId/suspend", requirePermission(getCode("Platform User", "suspend")), suspendStaff);
router.post("/:userId/activate", requirePermission(getCode("Platform User", "update")), activateStaff);
// Note: sessions uses Platform User.sessions as fallback since Platform Staff doesn't have it
router.post("/:userId/revoke-sessions", requirePermission(getCode("Platform User", "sessions")), revokeSessions);
router.get("/:userId/permissions", requirePermission(getCode("Platform User", "view")), getEffectivePermissions);

module.exports = router;
