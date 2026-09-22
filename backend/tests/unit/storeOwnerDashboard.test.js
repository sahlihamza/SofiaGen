const { buildStoreOwnerDashboardPayload } = require("../../src/service/StoreOwnerDashboardService");

describe("Store owner dashboard payload", () => {
  it("builds a premium dashboard shape with KPIs, analytics, alerts and insights", () => {
    const payload = buildStoreOwnerDashboardPayload({
      revenue: 1200,
      orders: 10,
      customers: 8,
      products: 20,
      outOfStock: 3,
      lowStock: 4,
      pendingOrders: 2,
      completedOrders: 7,
      cancelledOrders: 1,
      todayRevenue: 250,
      yesterdayRevenue: 200,
      monthlyRevenue: 1200,
      yearlyRevenue: 15000,
      series: [
        { date: "2026-08-01", revenue: 100, orders: 2 },
        { date: "2026-08-02", revenue: 200, orders: 3 },
      ],
      topProducts: [{ productName: "T-shirt", stockQuantity: 10 }],
      healthScore: 86,
    });

    expect(payload.kpis).toBeDefined();
    expect(payload.kpis.todaySales).toBe(250);
    expect(payload.analytics.series).toHaveLength(2);
    expect(payload.alerts).toEqual(expect.any(Array));
    expect(payload.aiInsights).toEqual(expect.any(Array));
    expect(payload.health.score).toBe(86);
  });
});
