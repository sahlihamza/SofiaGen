const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  assignPermissions,
  deleteRole,
  getPermissions,
  getPredefinedRoles,
} = require("../controller/RoleController");
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");

router.get("/permissions", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Staff", "view")), getPermissions);
router.get("/roles", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Staff", "view")), getRoles);
router.get("/predefined", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Staff", "view")), getPredefinedRoles);
router.get("/roles/:id", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Staff", "view")), getRoleById);
router.post("/roles", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Staff", "create")), createRole);
router.put("/roles/:id", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Staff", "update")), updateRole);
router.put("/roles/:id/permissions", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Staff", "update")), assignPermissions);
router.delete("/roles/:id", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Staff", "delete")), deleteRole);

module.exports = router;
