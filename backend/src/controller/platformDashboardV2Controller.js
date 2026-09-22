const PlatformDashboardV2Service = require("../service/PlatformDashboardV2Service");

/**
 * GET /api/v1/platform/dashboard-v2/full
 * Full enterprise Super Admin dashboard aggregation.
 */
const getFullSuperAdminDashboard = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getFullDashboard();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/kpi
 * KPI cards (stores, MRR/ARR, revenue, subscriptions, payments, users, orders...).
 */
const getKPIs = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getKPIs(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/revenue
 * Revenue analytics (monthly, daily, byPlan, comparison, forecast).
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getRevenueAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/stores
 * Store analytics (byStatus, byPlan, byCountry, monthly).
 */
const getStoreAnalytics = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getStoreAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/subscriptions
 * Subscription analytics (byStatus, byPlan MRR/ARR, events, expiring).
 */
const getSubscriptionAnalytics = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getSubscriptionAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/payments
 * Payment analytics (byStatus, byGateway, byCurrency, byCountry, refunds, chargebacks, successRate).
 */
const getPaymentAnalytics = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getPaymentAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/financial
 * Financial analytics (invoices, taxes, coupons, discounts, profit, margin, forecast).
 */
const getFinancialAnalytics = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getFinancialAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/advanced-metrics
 * Advanced SaaS metrics (Activation, Trial Conv, CAC, LTV, NRR, GRR, Churn...).
 */
const getAdvancedMetrics = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getAdvancedMetrics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/top-stores
 * Top revenue stores table.
 */
const getTopStores = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const data = await PlatformDashboardV2Service.getTopStores(limit, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/activities
 * Recent activities timeline (audit log).
 */
const getRecentActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const data = await PlatformDashboardV2Service.getRecentActivity(limit, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/alerts
 * Alert center (critical/warning/info alerts).
 */
const getAlerts = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getAlerts(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/geographic
 * Geographic analytics (stores & revenue by country).
 */
const getGeographicAnalytics = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getGeographicAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/providers
 * Payment providers analytics (Stripe, Flouci, Konnect...).
 */
const getProvidersAnalytics = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getProvidersAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/usage
 * Usage analytics (products, variants, categories, images, orders, customers...).
 */
const getUsageAnalytics = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getUsageAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/health
 * Platform health (service status, uptime, latency).
 */
const getPlatformHealth = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getPlatformHealth(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/infrastructure
 * Infrastructure (CPU, RAM, disk, workers, queues, emails, SMS, push).
 */
const getInfrastructure = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getInfrastructure(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

/**
 * GET /api/v1/platform/dashboard-v2/risk
 * Risk analysis (at-risk stores, churn signals, quota exceeded).
 */
const getRiskAnalysis = async (req, res) => {
  try {
    const data = await PlatformDashboardV2Service.getRiskAnalysis(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
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
};
