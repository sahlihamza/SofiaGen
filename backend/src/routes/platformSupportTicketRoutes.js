const express = require("express");
const { getCode } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  isAuth,
  loadUser,
  requirePermission,
  requireSuperAdmin,
} = require("../middleware/auth");
const {
  getPlatformTickets,
  getPlatformAnalytics,
} = require("../controller/platformSupportTicketController");

router.use(isAuth, loadUser);

router.get(
  "/",
  requirePermission(getCode("Platform Support Ticket", "view")),
  getPlatformTickets
);
router.get(
  "/analytics",
  requirePermission(getCode("Platform Support Ticket", "view")),
  getPlatformAnalytics
);

module.exports = router;
