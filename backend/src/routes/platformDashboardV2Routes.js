const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getFullSuperAdminDashboard,
  getKPIs,
  getRevenueAnalytics,
  getStoreAnalytics,
  getSubscriptionAnalytics,
  getPaymentAnalytics,
  getFinancialAnalytics,
  getAdvancedMetrics,
  getTopStores,
  getRecentActivity,
  getAlerts,
  getGeographicAnalytics,
  getProvidersAnalytics,
  getUsageAnalytics,
  getPlatformHealth,
  getInfrastructure,
  getRiskAnalysis,
} = require("../controller/platformDashboardV2Controller");
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission, requireSuperAdmin } = require("../middleware/auth");

router.use(isAuth, loadUser, resolveAuthorizationContext, requireSuperAdmin);

/**
 * @swagger
 * /v1/platform/dashboard-v2/kpi:
 *   get:
 *     summary: KPI cards (stores, MRR/ARR, revenue, subscriptions, payments, users, orders)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     parameters:
 *       - in: query, name range, schema: { type: string, enum: ["7d","30d","90d","12m"] }
 *       - in: query, name startDate, schema: { type: string, format: date }
 *       - in: query, name endDate, schema: { type: string, format: date }
 *       - in: query, name country, schema: { type: string }
 *       - in: query, name plan, schema: { type: string }
 *       - in: query, name status, schema: { type: string }
 *       - in: query, name store, schema: { type: string, enum: ["with_orders","no_orders"] }
 *     responses:
 *       200:
 *         description: KPI payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/kpi", requirePermission(getCode("Analytics", "view")), getKPIs);

/**
 * @swagger
 * /v1/platform/dashboard-v2/revenue:
 *   get:
 *     summary: Revenue analytics (monthly, daily, byPlan, comparison, forecast)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     parameters:
 *       - in: query, name range, schema: { type: string, enum: ["7d","30d","90d","12m"] }
 *       - in: query, name startDate, schema: { type: string, format: date }
 *       - in: query, name endDate, schema: { type: string, format: date }
 *       - in: query, name country, schema: { type: string }
 *       - in: query, name plan, schema: { type: string }
 *       - in: query, name status, schema: { type: string }
 *       - in: query, name store, schema: { type: string, enum: ["with_orders","no_orders"] }
 *     responses:
 *       200:
 *         description: Revenue analytics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/revenue", requirePermission(getCode("Analytics", "view")), getRevenueAnalytics);

/**
 * @swagger
 * /v1/platform/dashboard-v2/stores:
 *   get:
 *     summary: Store analytics (byStatus, byPlan, byCountry, monthly)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     parameters:
 *       - in: query, name range, schema: { type: string, enum: ["7d","30d","90d","12m"] }
 *       - in: query, name startDate, schema: { type: string, format: date }
 *       - in: query, name endDate, schema: { type: string, format: date }
 *       - in: query, name country, schema: { type: string }
 *       - in: query, name plan, schema: { type: string }
 *       - in: query, name status, schema: { type: string }
 *       - in: query, name store, schema: { type: string, enum: ["with_orders","no_orders"] }
 *     responses:
 *       200:
 *         description: Store analytics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/stores", requirePermission(getCode("Analytics", "view")), getStoreAnalytics);

/**
 * @swagger
 * /v1/platform/dashboard-v2/subscriptions:
 *   get:
 *     summary: Subscription analytics (byStatus, byPlan MRR/ARR, events, expiring)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     parameters:
 *       - in: query, name range, schema: { type: string, enum: ["7d","30d","90d","12m"] }
 *       - in: query, name startDate, schema: { type: string, format: date }
 *       - in: query, name endDate, schema: { type: string, format: date }
 *       - in: query, name country, schema: { type: string }
 *       - in: query, name plan, schema: { type: string }
 *       - in: query, name status, schema: { type: string }
 *       - in: query, name store, schema: { type: string, enum: ["with_orders","no_orders"] }
 *     responses:
 *       200:
 *         description: Subscription analytics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/subscriptions", requirePermission(getCode("Analytics", "view")), getSubscriptionAnalytics);

/**
 * @swagger
 * /v1/platform/dashboard-v2/payments:
 *   get:
 *     summary: Payment analytics (byStatus, byGateway, byCurrency, byCountry, refunds, chargebacks, successRate)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     parameters:
 *       - in: query, name range, schema: { type: string, enum: ["7d","30d","90d","12m"] }
 *       - in: query, name startDate, schema: { type: string, format: date }
 *       - in: query, name endDate, schema: { type: string, format: date }
 *       - in: query, name country, schema: { type: string }
 *       - in: query, name plan, schema: { type: string }
 *       - in: query, name status, schema: { type: string }
 *       - in: query, name store, schema: { type: string, enum: ["with_orders","no_orders"] }
 *     responses:
 *       200:
 *         description: Payment analytics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/payments", requirePermission(getCode("Analytics", "view")), getPaymentAnalytics);

/**
 * @swagger
 * /v1/platform/dashboard-v2/financial:
 *   get:
 *     summary: Financial analytics (invoices, taxes, coupons, discounts, profit, margin, forecast)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     parameters:
 *       - in: query, name range, schema: { type: string, enum: ["7d","30d","90d","12m"] }
 *       - in: query, name startDate, schema: { type: string, format: date }
 *       - in: query, name endDate, schema: { type: string, format: date }
 *       - in: query, name country, schema: { type: string }
 *       - in: query, name plan, schema: { type: string }
 *       - in: query, name status, schema: { type: string }
 *       - in: query, name store, schema: { type: string, enum: ["with_orders","no_orders"] }
 *     responses:
 *       200:
 *         description: Financial analytics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/financial", requirePermission(getCode("Analytics", "view")), getFinancialAnalytics);

/**
 * @swagger
 * /v1/platform/dashboard-v2/advanced-metrics:
 *   get:
 *     summary: Advanced SaaS metrics (Activation, Trial Conv, CAC, LTV, NRR, GRR, Churn, Expansion, ARPU)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     parameters:
 *       - in: query, name range, schema: { type: string, enum: ["7d","30d","90d","12m"] }
 *       - in: query, name startDate, schema: { type: string, format: date }
 *       - in: query, name endDate, schema: { type: string, format: date }
 *       - in: query, name country, schema: { type: string }
 *       - in: query, name plan, schema: { type: string }
 *       - in: query, name status, schema: { type: string }
 *       - in: query, name store, schema: { type: string, enum: ["with_orders","no_orders"] }
 *     responses:
 *       200:
 *         description: Advanced metrics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/advanced-metrics", requirePermission(getCode("Analytics", "view")), getAdvancedMetrics);

/**
 * @swagger
 * /v1/platform/dashboard-v2/top-stores:
 *   get:
 *     summary: Top revenue stores table
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     parameters:
 *       - in: query, name limit, schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query, name range, schema: { type: string, enum: ["7d","30d","90d","12m"] }
 *       - in: query, name country, schema: { type: string }
 *       - in: query, name plan, schema: { type: string }
 *       - in: query, name status, schema: { type: string }
 *       - in: query, name store, schema: { type: string, enum: ["with_orders","no_orders"] }
 *     responses:
 *       200:
 *         description: Top stores list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array }
 */
router.get("/top-stores", requirePermission(getCode("Analytics", "view")), getTopStores);

/**
 * @swagger
 * /v1/platform/dashboard-v2/activities:
 *   get:
 *     summary: Recent activities timeline (audit log)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     parameters:
 *       - in: query, name limit, schema: { type: integer, default: 30, maximum: 100 }
 *     responses:
 *       200:
 *         description: Recent activities list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array }
 */
router.get("/activities", requirePermission(getCode("Analytics", "view")), getRecentActivity);

/**
 * @swagger
 * /v1/platform/dashboard-v2/alerts:
 *   get:
 *     summary: Alert center (critical/warning/info alerts including infrastructure signals)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     responses:
 *       200:
 *         description: Alerts list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array }
 */
router.get("/alerts", requirePermission(getCode("Analytics", "view")), getAlerts);

/**
 * @swagger
 * /v1/platform/dashboard-v2/geographic:
 *   get:
 *     summary: Geographic analytics (stores & revenue by country)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     responses:
 *       200:
 *         description: Geographic analytics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/geographic", requirePermission(getCode("Analytics", "view")), getGeographicAnalytics);

/**
 * @swagger
 * /v1/platform/dashboard-v2/providers:
 *   get:
 *     summary: Payment providers analytics (Stripe, Flouci, Konnect, Click To Pay, PayPal, Razorpay)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     responses:
 *       200:
 *         description: Providers analytics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/providers", requirePermission(getCode("Analytics", "view")), getProvidersAnalytics);

/**
 * @swagger
 * /v1/platform/dashboard-v2/usage:
 *   get:
 *     summary: Usage analytics (products, variants, categories, images, orders, customers...)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     responses:
 *       200:
 *         description: Usage analytics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/usage", requirePermission(getCode("Analytics", "view")), getUsageAnalytics);

/**
 * @swagger
 * /v1/platform/dashboard-v2/health:
 *   get:
 *     summary: Platform health (service status, uptime, latency, Mongo connection state)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     responses:
 *       200:
 *         description: Platform health payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/health", requirePermission(getCode("Analytics", "view")), getPlatformHealth);

/**
 * @swagger
 * /v1/platform/dashboard-v2/infrastructure:
 *   get:
 *     summary: Infrastructure (CPU, RAM, disk, workers, queues, emails, SMS, push)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     responses:
 *       200:
 *         description: Infrastructure payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/infrastructure", requirePermission(getCode("Analytics", "view")), getInfrastructure);

/**
 * @swagger
 * /v1/platform/dashboard-v2/risk:
 *   get:
 *     summary: Risk analysis (at-risk stores, churn signals, quota exceeded)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     responses:
 *       200:
 *         description: Risk analysis payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/risk", requirePermission(getCode("Analytics", "view")), getRiskAnalysis);

/**
 * @swagger
 * /v1/platform/dashboard-v2/full:
 *   get:
 *     summary: Full aggregated Super Admin dashboard (all sections in one call, cached 45s)
 *     security: [{ bearerAuth: [] }]
 *     tags: [SuperAdmin Dashboard]
 *     responses:
 *       200:
 *         description: Complete dashboard payload with all 16 sections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */
router.get("/full", requirePermission(getCode("Analytics", "view")), getFullSuperAdminDashboard);

module.exports = router;
