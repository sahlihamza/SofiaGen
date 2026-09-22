const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getAllPlans,
  getActivePlans,
  getAllSubscriptions,
  getPlanById,
  createPlan,
  updatePlan,
  clonePlan,
  updatePlanStatus,
  activatePlan,
  deactivatePlan,
  archivePlan,
  getPlanSubscriptions,
  getPlanSubscriptionsSummary,
  getPlanAffectedStores,
  getPlanHistory,
  getPlanAuditLog,
  getUsageQuotas,
  getTrialSubscriptions,
  updateTrialConfig,
  assignPlanToStore,
  deletePlan,
  generateInvoiceForPayment,
  upgradeSubscription,
  downgradeSubscription,
  suspendSubscription,
  downgradePlanSubscription,
  retryFailedPayment,
  checkTrialEndings,
  processOverQuotaGracePeriods,
  getSubscriptionHistory,
  getAllSubscriptionHistory,
  getAllSubscriptionEvents,
  getAllPlansExtended,
  getPlanUsageStats,
  getAllPermissions,
} = require("../controller/platformPlanController");
const {
  renewSubscription,
  cancelSubscription,
  resumeSubscription,
  applyCouponToSubscription,
} = require("../controller/subscriptionController");
const {
  isAuth,
  loadUser, resolveAuthorizationContext, requirePermission,
  requireSuperAdmin,
} = require("../middleware/auth");

router.use(isAuth, loadUser, resolveAuthorizationContext);

router.get("/", requirePermission(getCode("Platform Plan", "view")), getAllPlansExtended);
router.get("/active/list", requirePermission(getCode("Platform Plan", "view")), getActivePlans);
router.get("/subscriptions", requirePermission(getCode("Platform Plan", "view")), getAllSubscriptions);
router.get("/subscription-history", requirePermission(getCode("Platform Plan", "view")), getAllSubscriptionHistory);
router.get("/subscription-events", requirePermission(getCode("Platform Plan", "view")), getAllSubscriptionEvents);
router.get("/usage", requirePermission(getCode("Platform Plan", "view")), getUsageQuotas);
router.get("/trials", requirePermission(getCode("Platform Plan", "view")), getTrialSubscriptions);
router.put("/trial-config", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, updateTrialConfig);

router.post("/", requirePermission(getCode("Platform Plan", "create")), createPlan);
router.get("/:id", requirePermission(getCode("Platform Plan", "view")), getPlanById);
router.put("/:id", requirePermission(getCode("Platform Plan", "update")), updatePlan);
router.post("/:id/clone", requirePermission(getCode("Platform Plan", "create")), clonePlan);
router.patch("/:id/status", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, updatePlanStatus);
router.post("/:id/activate", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, activatePlan);
router.post("/:id/deactivate", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, deactivatePlan);
router.post("/:id/archive", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, archivePlan);
router.post("/:id/assign", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, assignPlanToStore);
router.post("/:id/downgrade", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, downgradePlanSubscription);
router.get("/:id/subscriptions", requirePermission(getCode("Platform Plan", "view")), getPlanSubscriptions);
router.get("/:id/subscriptions/summary", requirePermission(getCode("Platform Plan", "view")), getPlanSubscriptionsSummary);
router.get("/:id/affected-stores", requirePermission(getCode("Platform Plan", "view")), getPlanAffectedStores);
router.get("/:id/audit-log", requirePermission(getCode("Platform Plan", "view")), requireSuperAdmin, getPlanAuditLog);
router.get("/:id/history", requirePermission(getCode("Platform Plan", "view")), getPlanHistory);
router.get("/stores/:storeId/history", requirePermission(getCode("Platform Plan", "view")), getSubscriptionHistory);
router.delete("/:id", requirePermission(getCode("Platform Plan", "delete")), requireSuperAdmin, deletePlan);

router.post("/subscriptions/:id/upgrade", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, upgradeSubscription);
router.post("/subscriptions/:id/downgrade", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, downgradeSubscription);
router.post("/subscriptions/:id/suspend", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, suspendSubscription);
router.post("/subscriptions/:id/cancel", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, cancelSubscription);
router.post("/subscriptions/:id/renew", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, renewSubscription);
router.post("/subscriptions/:id/resume", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, resumeSubscription);
router.post("/subscriptions/:id/apply-coupon", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, applyCouponToSubscription);
router.post("/subscriptions/:id/retry-payment", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, retryFailedPayment);
router.get("/trials/ending-soon", requirePermission(getCode("Platform Plan", "view")), checkTrialEndings);
router.post("/subscriptions/process-over-quota", requirePermission(getCode("Platform Plan", "update")), requireSuperAdmin, processOverQuotaGracePeriods);

router.get("/usage-stats/:planId", requirePermission(getCode("Platform Plan", "view")), getPlanUsageStats);
router.get("/permissions", requirePermission(getCode("Platform Role", "view")), getAllPermissions);

module.exports = router;
