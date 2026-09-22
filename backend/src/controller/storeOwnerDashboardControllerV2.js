const StoreOwnerDashboardServiceV2 = require("../service/StoreOwnerDashboardServiceV2");
const { normalizePermissionCode } = require("../utils/normalizePermissionCode");

// STORE-DASHBOARD-01 28: Quick Actions must respect the caller's real
// permissions, never a bare `role === "admin"` check. A store owner's role
// is assigned on their User.role (a platform-scoped role document, even
// though it grants store-module permissions like orders/products) and their
// UserStore.roleId is null  they don't need a separate membership role,
// they're the owner. A staff member invited to the store, by contrast, has
// their role on UserStore.roleId and nothing on User.role. This mirrors
// buildPermissionGuard's own fallback chain (middleware/auth.js) exactly:
// prefer req.authContext.permissions (covers the owner's platform-role
// case, already populated by resolveAuthorizationContext since this route's
// path matches its platform-route prefix list), and only fall back to the
// store membership's role permissions when that's empty.
const getCallerPermissionCodes = (req) => {
  if (req.user?.isSuperAdmin) return null; // null = every action allowed
  if (req.authContext?.permissions?.size) return req.authContext.permissions;
  const rolePermissions = req.storeMembership?.roleId?.permissions || [];
  return new Set(rolePermissions.map((p) => normalizePermissionCode(p.code)));
};

const getStoreOwnerDashboardV2 = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.user?.currentStoreId || null;
    // SO-15: the below-the-fold widgets (AI insights, top products, best
    // customers, sales channels, recent activity) are fetched lazily by the
    // frontend on scroll via GET /widget/:widget instead  omitted here so
    // the initial dashboard load doesn't pay for work nobody may ever
    // scroll down to see. Each of those builders/routes still exists
    // unchanged and independently cached (see getStoreOwnerDashboardWidget).
    // STORE-DASHBOARD-01 25/29: the analytics range is a real input to the
    // payload this key covers  without it here, a first load at
    // range=7days would serve its 7-day series back for up to CACHE_TTL
    // seconds to a request that just asked for range=90days.
    const range = req.query.range || "30days";
    const payload = await StoreOwnerDashboardServiceV2.getCached(storeId, `full:${range}`, async () => {
      const kpis = await StoreOwnerDashboardServiceV2.buildKpiCardsPayload(storeId);
      const [
        analytics, orders, customers, products, inventory, payments, shipping, marketing, reviews,
        performance, visitors, financial, tasks, alerts, health, goals, conversionFunnel, onboarding,
      ] = await Promise.all([
        StoreOwnerDashboardServiceV2.buildSalesAnalyticsPayload(storeId, range),
        StoreOwnerDashboardServiceV2.buildOrdersPayload(storeId),
        StoreOwnerDashboardServiceV2.buildCustomersPayload(storeId),
        StoreOwnerDashboardServiceV2.buildProductsPayload(storeId),
        StoreOwnerDashboardServiceV2.buildInventoryPayload(storeId),
        StoreOwnerDashboardServiceV2.buildPaymentsPayload(storeId),
        StoreOwnerDashboardServiceV2.buildShippingPayload(storeId),
        StoreOwnerDashboardServiceV2.buildMarketingPayload(storeId),
        StoreOwnerDashboardServiceV2.buildReviewsPayload(storeId),
        StoreOwnerDashboardServiceV2.buildStorePerformancePayload(storeId),
        StoreOwnerDashboardServiceV2.buildVisitorsPayload(storeId),
        StoreOwnerDashboardServiceV2.buildFinancialPayload(storeId),
        StoreOwnerDashboardServiceV2.buildTasksPayload(storeId),
        StoreOwnerDashboardServiceV2.buildAlertsPayload(storeId),
        StoreOwnerDashboardServiceV2.buildHealthScorePayload(storeId),
        StoreOwnerDashboardServiceV2.buildGoalsPayload(storeId),
        StoreOwnerDashboardServiceV2.buildConversionFunnelPayload(storeId),
        StoreOwnerDashboardServiceV2.buildOnboardingPayload(storeId),
      ]);
      return {
        ...kpis, analytics, orders, customers, products, inventory, payments, shipping, marketing, reviews,
        performance, visitors, financial, tasks, alerts, health, goals, conversionFunnel, onboarding,
      };
    });
    // Computed fresh on every request, outside the cached block: the cache
    // key is per-store, not per-caller, so a permission-filtered list must
    // never be cached and replayed to a different staff member with
    // different permissions on the next request for the same store.
    const actions = StoreOwnerDashboardServiceV2.buildQuickActionsPayload(getCallerPermissionCodes(req));
    res.json({ ...payload, actions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStoreOwnerDashboardWidget = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.user?.currentStoreId || null;
    const widget = req.params.widget;
    const range = req.query.range || "30days";
    const builders = {
      kpi: StoreOwnerDashboardServiceV2.buildKpiCardsPayload,
      analytics: () => StoreOwnerDashboardServiceV2.buildSalesAnalyticsPayload(storeId, range),
      orders: StoreOwnerDashboardServiceV2.buildOrdersPayload,
      customers: StoreOwnerDashboardServiceV2.buildCustomersPayload,
      products: StoreOwnerDashboardServiceV2.buildProductsPayload,
      inventory: StoreOwnerDashboardServiceV2.buildInventoryPayload,
      payments: StoreOwnerDashboardServiceV2.buildPaymentsPayload,
      shipping: StoreOwnerDashboardServiceV2.buildShippingPayload,
      marketing: StoreOwnerDashboardServiceV2.buildMarketingPayload,
      reviews: StoreOwnerDashboardServiceV2.buildReviewsPayload,
      performance: StoreOwnerDashboardServiceV2.buildStorePerformancePayload,
      visitors: StoreOwnerDashboardServiceV2.buildVisitorsPayload,
      financial: StoreOwnerDashboardServiceV2.buildFinancialPayload,
      tasks: StoreOwnerDashboardServiceV2.buildTasksPayload,
      alerts: StoreOwnerDashboardServiceV2.buildAlertsPayload,
      recentActivity: StoreOwnerDashboardServiceV2.buildRecentActivityPayload,
      topProducts: StoreOwnerDashboardServiceV2.buildTopProductsPayload,
      bestCustomers: StoreOwnerDashboardServiceV2.buildBestCustomersPayload,
      salesChannels: StoreOwnerDashboardServiceV2.buildSalesChannelsPayload,
      aiInsights: StoreOwnerDashboardServiceV2.buildAiInsightsPayload,
      health: StoreOwnerDashboardServiceV2.buildHealthScorePayload,
      goals: StoreOwnerDashboardServiceV2.buildGoalsPayload,
      conversionFunnel: StoreOwnerDashboardServiceV2.buildConversionFunnelPayload,
      onboarding: StoreOwnerDashboardServiceV2.buildOnboardingPayload,
    };
    const builder = builders[widget];
    if (!builder) return res.status(404).json({ message: "Widget not found" });
    // Same range-isolation fix as the full dashboard above  only the
    // analytics widget takes a range, so every other widget's key is
    // unaffected.
    const cacheSuffix = widget === "analytics" ? `${widget}:${range}` : widget;
    const data = await StoreOwnerDashboardServiceV2.getCached(storeId, cacheSuffix, () => builder(storeId));
    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const refreshStoreOwnerDashboard = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.user?.currentStoreId || null;
    await StoreOwnerDashboardServiceV2.invalidateCache(storeId);
    res.json({ message: "Dashboard cache invalidated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStoreOwnerDashboardV2, getStoreOwnerDashboardWidget, refreshStoreOwnerDashboard };
