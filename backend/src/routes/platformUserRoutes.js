const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  suspendUser,
  reactivateUser,
  resetPassword,
  reset2FA,
  logoutAllDevices,
  assignRole,
  removeRole,
  bulkAction,
  bulkExport,
  bulkAssignRole,
  getUserActivity,
  getUserSessions,
  logoutDevice,
  getUserPermissions,
  getUserStoreRoles,
  blockUser,
  unblockUser,
  archiveUser,
  unarchiveUser,
  impersonateUser,
  duplicateUser,
  resendInvitation,
  forcePasswordChange,
  sendSetupEmail,
  getUserLoginHistory,
  getAllLoginHistory,
  dashboardStats,
  getUserProfile,
} = require("../controller/platformUserController");
const {
  isAuth,
  loadUser, resolveAuthorizationContext, requirePermission,
  requireSuperAdmin,
} = require("../middleware/auth");

// Every action in this router is a *platform* action. Access is driven by the
// `platform.user.*` permission codes resolved through the caller's platform
// role (e.g. "Platform Admin" / "Platform User Manager"). Super-admin is
// implicitly granted every platform permission.
//
// The only operations that remain Super-Admin-only are the destructive ones
// NOT granted to any delegated role:
//   - delete (platform.user.delete  reserved to Super Admin)
//   - impersonate (platform.user.impersonate  dedicated, critical, Super Admin only)
//   - duplicate / resend-invitation / send-setup-email / global login-history
//
// This lets a "Platform User Manager" view / update / suspend / block /
// archive / export / assign platform roles WITHOUT being a Super Admin, while
// still protecting the most sensitive lifecycle operations.
router.use(isAuth, loadUser, resolveAuthorizationContext);

// --- Collection ---
router.get("/", requirePermission(getCode("Platform User", "view")), getAllUsers);
router.post("/", requirePermission(getCode("Platform User", "create")), createUser);

// Global login history is highly privileged (cross-store)  Super Admin only.
router.post("/login-history", requirePermission(getCode("Platform User", "view")), requireSuperAdmin, getAllLoginHistory);
router.get("/dashboard/stats", requirePermission(getCode("Platform User", "view")), dashboardStats);

// --- Bulk (delegable when the caller holds the matching permission) ---
router.post("/bulk/suspend", requirePermission(getCode("Platform User", "suspend")), bulkAction);
router.post("/bulk/unblock", requirePermission(getCode("Platform User", "activate")), bulkAction);
router.post("/bulk/block", requirePermission(getCode("Platform User", "suspend")), bulkAction);
router.post("/bulk/archive", requirePermission(getCode("Platform User", "suspend")), bulkAction);
router.post("/bulk/unarchive", requirePermission(getCode("Platform User", "activate")), bulkAction);
router.post("/bulk/reactivate", requirePermission(getCode("Platform User", "activate")), bulkAction);
router.post("/bulk/force-password-change", requirePermission(getCode("Platform User", "update")), bulkAction);
router.post("/bulk/resend-invitation", requirePermission(getCode("Platform User", "create")), bulkAction);
// Bulk delete stays Super-Admin-only (platform.user.delete is not delegated).
router.post("/bulk/delete", requirePermission(getCode("Platform User", "delete")), requireSuperAdmin, bulkAction);
router.post("/bulk/export", requirePermission(getCode("Platform User", "export")), bulkExport);
router.post("/bulk/role-assign", requirePermission(getCode("Platform User", "update")), bulkAssignRole);

// --- Single user ---
router.get("/:userId", requirePermission(getCode("Platform User", "view")), getUser);
router.put("/:userId", requirePermission(getCode("Platform User", "update")), updateUser);
router.patch("/:userId", requirePermission(getCode("Platform User", "update")), updateUser);
router.delete("/:userId", requirePermission(getCode("Platform User", "delete")), requireSuperAdmin, deleteUser);

// Lifecycle (delegable to Platform User Manager)
router.post("/:userId/suspend", requirePermission(getCode("Platform User", "suspend")), suspendUser);
router.post("/:userId/reactivate", requirePermission(getCode("Platform User", "activate")), reactivateUser);
router.post("/:userId/block", requirePermission(getCode("Platform User", "suspend")), blockUser);
router.post("/:userId/unblock", requirePermission(getCode("Platform User", "activate")), unblockUser);
router.post("/:userId/archive", requirePermission(getCode("Platform User", "suspend")), archiveUser);
router.post("/:userId/unarchive", requirePermission(getCode("Platform User", "activate")), unarchiveUser);

// Security (delegable to Platform User Manager)
router.post("/:userId/reset-password", requirePermission(getCode("Platform User", "update")), resetPassword);
router.post("/:userId/2fa/reset", requirePermission(getCode("Platform User", "update")), reset2FA);
router.post("/:userId/reset-two-factor", requirePermission(getCode("Platform User", "update")), reset2FA);
router.post("/:userId/logout-all-devices", requirePermission(getCode("Platform User", "sessions")), logoutAllDevices);
router.post("/:userId/revoke-sessions", requirePermission(getCode("Platform User", "sessions")), logoutAllDevices);
router.post("/:userId/sessions/:sessionId/logout", requirePermission(getCode("Platform User", "sessions")), logoutDevice);
router.post("/:userId/force-password-change", requirePermission(getCode("Platform User", "update")), forcePasswordChange);

// Role management  only platform-scoped roles may be assigned (enforced in
// the service). Delegable to Platform User Manager.
router.post("/:userId/roles", requirePermission(getCode("Platform User", "update")), assignRole);
router.delete("/:userId/roles/:roleId", requirePermission(getCode("Platform User", "update")), removeRole);

// Profile / memberships / sessions / login history (read-only, delegable)
router.get("/:userId/profile", requirePermission(getCode("Platform User", "view")), getUserProfile);
router.get("/:userId/permissions", requirePermission(getCode("Platform User", "view")), getUserPermissions);
router.get("/:userId/store-roles", requirePermission(getCode("Platform User", "view")), getUserStoreRoles);
router.get("/:userId/sessions", requirePermission(getCode("Platform User", "view")), getUserSessions);
router.get("/:userId/activity", requirePermission(getCode("Platform User", "view")), getUserActivity);
// Per-user login history needs the dedicated critical permission; kept off the
// delegated User Manager matrix and reserved to Super Admin + impersonate holders.
router.get("/:userId/login-history", requirePermission(getCode("Platform User", "login_history")), getUserLoginHistory);

// Impersonation: dedicated, critical permission (platform.user.impersonate).
// Reserved to Super Admin via the role matrix  NOT granted to User Manager.
router.post("/:userId/impersonate", requirePermission(getCode("Platform User", "impersonate")), impersonateUser);

// Invitation / creation helpers  Super Admin only.
router.post("/:userId/duplicate", requirePermission(getCode("Platform User", "create")), requireSuperAdmin, duplicateUser);
router.post("/:userId/resend-invitation", requirePermission(getCode("Platform User", "create")), requireSuperAdmin, resendInvitation);
router.post("/:userId/send-setup-email", requirePermission(getCode("Platform User", "create")), requireSuperAdmin, sendSetupEmail);

module.exports = router;
