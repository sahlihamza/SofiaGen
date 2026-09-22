const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getDashboardMetrics,
  getRevenueAnalytics,
  getSubscriptionAnalytics,
  getUserAnalytics,
  getChurnAnalytics,
  getTrialsAnalytics,
  getPaymentsAnalytics,
} = require("../controller/platformAnalyticsController");
const {
  isAuth,
  loadUser, resolveAuthorizationContext, requirePermission,
  requireSuperAdmin,
} = require("../middleware/auth");

router.use(isAuth, loadUser, resolveAuthorizationContext, requireSuperAdmin);

router.get("/dashboard/metrics", requirePermission(getCode("Analytics", "view")), getDashboardMetrics);
router.get("/revenue", requirePermission(getCode("Analytics", "view")), getRevenueAnalytics);
router.get("/subscriptions", requirePermission(getCode("Analytics", "view")), getSubscriptionAnalytics);
router.get("/users", requirePermission(getCode("Analytics", "view")), getUserAnalytics);
router.get("/churn", requirePermission(getCode("Analytics", "view")), getChurnAnalytics);
router.get("/trials", requirePermission(getCode("Analytics", "view")), getTrialsAnalytics);
router.get("/payments", requirePermission(getCode("Analytics", "view")), getPaymentsAnalytics);

module.exports = router;
