const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const { requirePermission } = require("../middleware/auth");
const subscriptionController = require("../controller/subscriptionController");
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
} = require("../controller/planController");

// Create a new plan
router.post("/", createPlan);

// Get all plans with pagination, search, filters
router.get("/", getAllPlans);

// Get only active plans
router.get("/active/list", getActivePlans);

// Get all subscriptions
router.get("/subscriptions", getAllSubscriptions);

// Get global subscription history (Billing > Subscription History)
router.get("/subscription-history", getAllSubscriptionHistory);

// Get global subscription events (Billing > Subscription Events)
router.get("/subscription-events", getAllSubscriptionEvents);

// Get usage quotas across all stores
router.get("/usage", getUsageQuotas);

// Get trial subscriptions
router.get("/trials", getTrialSubscriptions);

// Update trial configuration
router.put("/trial-config", updateTrialConfig);

// Get plan by ID
router.get("/:id", getPlanById);

// Update a plan
router.put("/:id", updatePlan);

// Clone a plan
router.post("/:id/clone", clonePlan);

// Update plan status
router.patch("/:id/status", updatePlanStatus);

// Activate a plan
router.post("/:id/activate", activatePlan);

// Deactivate a plan
router.post("/:id/deactivate", deactivatePlan);

// Archive a plan
router.post("/:id/archive", archivePlan);

// Assign plan to a store / migrate subscription
router.post("/:id/assign", assignPlanToStore);

// Downgrade subscription to a lower plan
router.post("/:id/downgrade", downgradePlanSubscription);

// Get subscriptions for a plan
router.get("/:id/subscriptions", getPlanSubscriptions);

// Get plan subscription summary
router.get("/:id/subscriptions/summary", getPlanSubscriptionsSummary);

// Subscription actions
router.post("/subscriptions/:id/upgrade", upgradeSubscription);
router.post("/subscriptions/:id/downgrade", downgradeSubscription);
router.post("/subscriptions/:id/suspend", suspendSubscription);

// Subscription lifecycle actions (pause = cancel, renew, resume, coupons) 
// implemented in subscriptionController, exposed here so the admin UI can
// call every action under the same /billing/plans base path.
router.post("/subscriptions/:id/cancel", requirePermission(getCode("Platform Plan", "update")), subscriptionController.cancelSubscription);
router.post("/subscriptions/:id/renew", requirePermission(getCode("Platform Plan", "update")), subscriptionController.renewSubscription);
router.post("/subscriptions/:id/resume", requirePermission(getCode("Platform Plan", "update")), subscriptionController.resumeSubscription);
router.post("/subscriptions/:id/apply-coupon", requirePermission(getCode("Platform Plan", "update")), subscriptionController.applyCouponToSubscription);

// Get affected stores for a plan
router.get("/:id/affected-stores", getPlanAffectedStores);

// Get plan audit log
router.get("/:id/audit-log", getPlanAuditLog);

// Get plan subscription history
router.get("/:id/history", getPlanHistory);

// Get subscription history for a store
router.get("/stores/:storeId/history", getSubscriptionHistory);

// Delete a plan
router.delete("/:id", deletePlan);

// Payment retry
router.post("/subscriptions/:id/retry-payment", retryFailedPayment);

// Trial ending check (admin/scheduler)
router.get("/trials/ending-soon", checkTrialEndings);

// Process expired over-quota grace periods (admin/scheduler)
router.post("/subscriptions/process-over-quota", processOverQuotaGracePeriods);

const PlanCatalogService = require("../service/PlanCatalogService");

const catalogError = (res, err) =>
  res.status(err.status || 500).json({ success: false, code: err.code, message: err.message });

const canViewPlan = requirePermission(getCode("Platform Plan", "view"));
const canUpdatePlan = requirePermission(getCode("Platform Plan", "update"));

router.get("/:id/versions", canViewPlan, async (req, res) => {
  try {
    const data = await PlanCatalogService.getPlan(req.params.id);
    return res.status(200).json({ success: true, data: data.versions });
  } catch (err) {
    return catalogError(res, err);
  }
});

router.post("/:id/versions", canUpdatePlan, async (req, res) => {
  try {
    const version = await PlanCatalogService.createVersion(req.params.id, req.body || {}, req.user?._id || null);
    return res.status(201).json({ success: true, message: "Version draft creee", data: version });
  } catch (err) {
    return catalogError(res, err);
  }
});

router.put("/:id/versions/:versionId", canUpdatePlan, async (req, res) => {
  try {
    const version = await PlanCatalogService.updateVersion(
      req.params.id,
      req.params.versionId,
      req.body || {},
      req.user?._id || null
    );
    return res.status(200).json({ success: true, message: "Version mise a jour", data: version });
  } catch (err) {
    return catalogError(res, err);
  }
});

router.get("/:id/versions/:versionId/impact", canViewPlan, async (req, res) => {
  try {
    const impact = await PlanCatalogService.getPublishImpact(req.params.id);
    return res.status(200).json({ success: true, data: impact });
  } catch (err) {
    return catalogError(res, err);
  }
});

router.post("/:id/versions/:versionId/publish", canUpdatePlan, async (req, res) => {
  try {
    const result = await PlanCatalogService.publishVersion(
      req.params.id,
      req.params.versionId,
      req.user?._id || null
    );
    return res.status(200).json({ success: true, message: "Version publiee", data: result });
  } catch (err) {
    return catalogError(res, err);
  }
});

router.get("/:id/prices", canViewPlan, async (req, res) => {
  try {
    const prices = await PlanCatalogService.listPrices(req.params.id);
    return res.status(200).json({ success: true, data: prices });
  } catch (err) {
    return catalogError(res, err);
  }
});

router.post("/:id/prices", canUpdatePlan, async (req, res) => {
  try {
    const price = await PlanCatalogService.createPrice(req.params.id, req.body || {}, req.user?._id || null);
    return res.status(201).json({ success: true, message: "Tarif cree", data: price });
  } catch (err) {
    return catalogError(res, err);
  }
});

module.exports = router;
