const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getAllPlatformRoles,
  getPlatformRoleById,
  createPlatformRole,
  updatePlatformRole,
  deletePlatformRole,
  duplicatePlatformRole,
  getUsersByRole,
  getAllPermissions,
} = require("../controller/platformRoleController");
const {
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission,
  requireSuperAdmin,
} = require("../middleware/auth");

router.get("/", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Platform Role", "view")), getAllPlatformRoles);
router.get("/permissions", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Platform Role", "view")), getAllPermissions);
router.get("/:id", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Platform Role", "view")), getPlatformRoleById);
router.post("/", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Platform Role", "create")), createPlatformRole);
router.put("/:id", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Platform Role", "update")), updatePlatformRole);
router.delete("/:id", isAuth, loadUser, resolveAuthorizationContext, requireSuperAdmin, deletePlatformRole);
router.post("/:id/duplicate", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Platform Role", "create")), duplicatePlatformRole);
router.get("/:id/users", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Platform Role", "view")), getUsersByRole);

module.exports = router;
