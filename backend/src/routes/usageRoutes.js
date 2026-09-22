const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const usageController = require("../controller/usageController");

/**
 * @swagger
 * /api/platform/usage/increment:
 *   post:
 *     summary: Increment usage counter
 *     tags: [Usage Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storeId, quotaTypeCode]
 *             properties:
 *               storeId:
 *                 type: string
 *               quotaTypeCode:
 *                 type: string
 *               delta:
 *                 type: number
 *                 default: 1
 *               source:
 *                 type: string
 *                 enum: [manual, order, product, customer, api, storage, correction, other]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usage incremented successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post("/increment", requirePermission(getCode("Platform Plan", "update")), usageController.incrementUsage);

/**
 * @swagger
 * /api/platform/usage/subscriptions/{subscriptionId}/current:
 *   get:
 *     summary: Get current usage for a subscription
 *     tags: [Usage Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current usage data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/subscriptions/:subscriptionId/current", requirePermission(getCode("Platform Plan", "view")), usageController.getCurrentUsage);

/**
 * @swagger
 * /api/platform/usage/history:
 *   get:
 *     summary: Get usage history
 *     tags: [Usage Tracking]
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
 *           default: 50
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: quotaTypeCode
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usage history list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get("/history", requirePermission(getCode("Platform Plan", "view")), usageController.getUsageHistory);

/**
 * @swagger
 * /api/platform/usage/counters:
 *   get:
 *     summary: List usage counters
 *     tags: [Usage Tracking]
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
 *         name: storeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: quotaTypeCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [normal, warning, critical, blocked]
 *     responses:
 *       200:
 *         description: Usage counters list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
// Self-service (Store Owner's "My Usage" page) and platform-admin browsing
// share this endpoint  the controller itself enforces that a caller
// without "Platform Plan.view" can only ever see their own store's usage,
// never an explicit ?storeId= for someone else's store (see
// usageController.listUsageCounters).
router.get("/counters", usageController.listUsageCounters);

/**
 * @swagger
 * /api/platform/usage/summary:
 *   get:
 *     summary: Get usage summary
 *     tags: [Usage Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
// Same self-service/platform-admin split as /counters above.
router.get("/summary", usageController.getUsageSummary);

module.exports = router;
