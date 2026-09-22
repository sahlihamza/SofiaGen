const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { getSuperAdminDashboard } = require("../controller/platformDashboardController");
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission, requireSuperAdmin } = require("../middleware/auth");

router.use(isAuth, loadUser, resolveAuthorizationContext, requireSuperAdmin);

router.get("/", requirePermission(getCode("Analytics", "view")), getSuperAdminDashboard);

module.exports = router;
