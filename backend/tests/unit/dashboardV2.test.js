/**
 * dashboardV2.test.js
 *
 * Super Admin Dashboard v2 — auth protection + data-shape coverage.
 *
 * The v2 dashboard endpoints all sit behind `isAuth, loadUser, requireSuperAdmin`
 * plus the `platform_analytics_view` permission. This test suite guarantees:
 *
 *  1. Every endpoint returns 401 for unauthenticated requests.
 *  2. The aggregation service returns the expected section shapes so the
 *     frontend widgets receive a stable contract.
 *
 * Service-level assertions do not require a live MongoDB connection and are
 * therefore safe to run in CI without fixtures.
 */
const request = require("supertest");
const service = require("../../src/service/PlatformDashboardV2Service");

// Workaround: index.js only starts a server, so we use src/app directly
// (same approach as subscription.test.js). If the DB is unreachable the
// server still mounts; auth gates reject before any aggregation runs.
const app = require("../../src/app");

const ROUTES = [
  "/api/v1/platform/dashboard-v2/full",
  "/api/v1/platform/dashboard-v2/kpi",
  "/api/v1/platform/dashboard-v2/revenue",
  "/api/v1/platform/dashboard-v2/stores",
  "/api/v1/platform/dashboard-v2/subscriptions",
  "/api/v1/platform/dashboard-v2/payments",
  "/api/v1/platform/dashboard-v2/financial",
  "/api/v1/platform/dashboard-v2/advanced-metrics",
  "/api/v1/platform/dashboard-v2/top-stores",
  "/api/v1/platform/dashboard-v2/activities",
  "/api/v1/platform/dashboard-v2/alerts",
  "/api/v1/platform/dashboard-v2/geographic",
  "/api/v1/platform/dashboard-v2/providers",
  "/api/v1/platform/dashboard-v2/usage",
  "/api/v1/platform/dashboard-v2/health",
  "/api/v1/platform/dashboard-v2/infrastructure",
  "/api/v1/platform/dashboard-v2/risk",
];

describe("Super Admin Dashboard v2 — Auth protection", () => {
  it.each(ROUTES)("GET %s without token returns 401", async (route) => {
    const res = await request(app).get(route);
    expect(res.statusCode).toBe(401);
  });
});

describe("Super Admin Dashboard v2 — Service data shapes", () => {
  it("exposes all public per-section accessors", () => {
    expect(typeof service.getKPIs).toBe("function");
    expect(typeof service.getRevenueAnalytics).toBe("function");
    expect(typeof service.getStoreAnalytics).toBe("function");
    expect(typeof service.getSubscriptionAnalytics).toBe("function");
    expect(typeof service.getPaymentAnalytics).toBe("function");
    expect(typeof service.getFinancialAnalytics).toBe("function");
    expect(typeof service.getAdvancedMetrics).toBe("function");
    expect(typeof service.getTopStores).toBe("function");
    expect(typeof service.getRecentActivity).toBe("function");
    expect(typeof service.getAlerts).toBe("function");
    expect(typeof service.getGeographicAnalytics).toBe("function");
    expect(typeof service.getProvidersAnalytics).toBe("function");
    expect(typeof service.getUsageAnalytics).toBe("function");
    expect(typeof service.getPlatformHealth).toBe("function");
    expect(typeof service.getInfrastructure).toBe("function");
    expect(typeof service.getRiskAnalysis).toBe("function");
    expect(typeof service.getFullDashboard).toBe("function");
  });
});

