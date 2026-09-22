const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const subscriptionController = require("../controller/subscriptionController");

/**
 * @swagger
 * /api/platform/subscriptions:
 *   get:
 *     summary: Get all subscriptions with filters
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, trial, past_due, suspended, canceled, expired, pending]
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: planId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "-createdAt"
 *     responses:
 *       200:
 *         description: Paginated subscriptions list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get("/subscriptions", requirePermission(getCode("Platform Plan", "view")), subscriptionController.getAllSubscriptions);

router.get("/me", subscriptionController.getMySubscription);

// Get subscription by ID
router.get("/subscriptions/:id", requirePermission(getCode("Platform Plan", "view")), subscriptionController.getSubscriptionById);

// Upgrade subscription
router.post("/subscriptions/:id/upgrade", requirePermission(getCode("Platform Plan", "update")), subscriptionController.upgradeSubscription);

// Downgrade subscription
router.post("/subscriptions/:id/downgrade", requirePermission(getCode("Platform Plan", "update")), subscriptionController.downgradeSubscription);

// Suspend subscription
router.post("/subscriptions/:id/suspend", requirePermission(getCode("Platform Plan", "update")), subscriptionController.suspendSubscription);

// Cancel subscription
router.post("/subscriptions/:id/cancel", requirePermission(getCode("Platform Plan", "update")), subscriptionController.cancelSubscription);

// Renew subscription
router.post("/subscriptions/:id/renew", requirePermission(getCode("Platform Plan", "update")), subscriptionController.renewSubscription);

// Resume subscription
router.post("/subscriptions/:id/resume", requirePermission(getCode("Platform Plan", "update")), subscriptionController.resumeSubscription);

// Apply coupon to subscription
router.post("/subscriptions/:id/apply-coupon", requirePermission(getCode("Platform Plan", "update")), subscriptionController.applyCouponToSubscription);

// Assign plan to a store
router.post("/subscriptions/assign", requirePermission(getCode("Platform Plan", "update")), subscriptionController.assignPlanToStore);

// Get subscription history for a store
router.get("/subscriptions/:storeId/history", requirePermission(getCode("Platform Plan", "view")), subscriptionController.getSubscriptionHistory);

// Get global subscription history (Billing > Subscription History)
router.get("/subscription-history", requirePermission(getCode("Platform Plan", "view")), subscriptionController.getAllSubscriptionHistory);

// Get global subscription events (Billing > Subscription Events)
router.get("/subscription-events", requirePermission(getCode("Platform Plan", "view")), subscriptionController.getAllSubscriptionEvents);

// Get trial subscriptions
router.get("/trials", requirePermission(getCode("Platform Plan", "view")), subscriptionController.getTrialSubscriptions);

// Retry failed payment
router.post("/subscriptions/:id/retry-payment", requirePermission(getCode("Platform Plan", "update")), subscriptionController.retryFailedPayment);

// Trial ending check (admin/scheduler)
router.get("/trials/ending-soon", requirePermission(getCode("Platform Plan", "view")), subscriptionController.checkTrialEndings);

// Process expired over-quota grace periods (admin/scheduler)
router.post("/subscriptions/process-over-quota", requirePermission(getCode("Platform Plan", "update")), subscriptionController.processOverQuotaGracePeriods);

const canUpdate = requirePermission(getCode("Platform Plan", "update"));
const canView = requirePermission(getCode("Platform Plan", "view"));

router.get("/transitions", canView, subscriptionController.getTransitionMatrix);
router.post("/:id/cancel", canUpdate, subscriptionController.cancelSubscription);
router.post("/:id/suspend", canUpdate, subscriptionController.suspendSubscription);
router.post("/:id/resume", canUpdate, subscriptionController.resumeSubscription);
router.post("/:id/extend-trial", canUpdate, subscriptionController.extendTrial);
router.post("/:id/force-status", canUpdate, subscriptionController.forceSubscriptionStatus);
router.post("/:id/retry-payment", canUpdate, subscriptionController.retryFailedPayment);
router.post("/subscriptions/:id/extend-trial", canUpdate, subscriptionController.extendTrial);
router.post("/subscriptions/:id/force-status", canUpdate, subscriptionController.forceSubscriptionStatus);

module.exports = router;
