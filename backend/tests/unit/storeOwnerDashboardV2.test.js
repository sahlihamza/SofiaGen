jest.mock("../../src/models/Order", () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
}));
jest.mock("../../src/models/Customer", () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock("../../src/models/Product", () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn(),
}));
jest.mock("../../src/models/ProductReview", () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn(),
}));
jest.mock("../../src/models/Payment", () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
}));
jest.mock("../../src/models/Coupon", () => ({
  countDocuments: jest.fn(),
}));
jest.mock("../../src/models/Store", () => ({
  findOne: jest.fn(),
}));
jest.mock("../../src/models/CustomerSession", () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
}));
jest.mock("../../src/models/AuditLog", () => ({
  countDocuments: jest.fn(),
}));

const { buildKpiCardsPayload, buildSalesAnalyticsPayload, buildHealthScorePayload, buildGoalsPayload, buildConversionFunnelPayload, buildQuickActionsPayload } = require("../../src/service/StoreOwnerDashboardServiceV2");

const mockOrder = require("../../src/models/Order");
const mockCustomer = require("../../src/models/Customer");
const mockProduct = require("../../src/models/Product");
const mockProductReview = require("../../src/models/ProductReview");
const mockPayment = require("../../src/models/Payment");
const mockCoupon = require("../../src/models/Coupon");
const mockStore = require("../../src/models/Store");
const mockCustomerSession = require("../../src/models/CustomerSession");
const mockAuditLog = require("../../src/models/AuditLog");

describe("Store owner dashboard v2 service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("buildKpiCardsPayload returns expected shape", async () => {
    mockOrder.aggregate.mockResolvedValueOnce([{ total: 5000 }]);
    mockOrder.aggregate.mockResolvedValueOnce([{ total: 500 }]);
    mockOrder.aggregate.mockResolvedValueOnce([{ total: 300 }]);
    mockOrder.aggregate.mockResolvedValueOnce([{ total: 2000 }]);
    mockOrder.aggregate.mockResolvedValueOnce([{ total: 10000 }]);
    mockOrder.aggregate.mockResolvedValueOnce([{ count: 10 }]);
    mockOrder.aggregate.mockResolvedValueOnce([{ count: 2 }]);
    mockOrder.aggregate.mockResolvedValueOnce([{ count: 8 }]);
    mockOrder.aggregate.mockResolvedValueOnce([{ count: 1 }]);
    mockOrder.aggregate.mockResolvedValueOnce([{ count: 5 }]);
    mockCustomer.countDocuments.mockResolvedValue(50);
    mockCustomer.countDocuments.mockResolvedValueOnce(5);
    mockProduct.countDocuments.mockResolvedValue(100);
    mockProduct.countDocuments.mockResolvedValueOnce(3);
    mockProduct.countDocuments.mockResolvedValueOnce(10);
    mockProduct.countDocuments.mockResolvedValueOnce(80);
    mockProduct.countDocuments.mockResolvedValueOnce(10);
    mockProduct.countDocuments.mockResolvedValueOnce(5);
    mockProduct.countDocuments.mockResolvedValueOnce(2);
    mockProductReview.countDocuments.mockResolvedValue(20);
    mockOrder.aggregate.mockResolvedValueOnce([{ count: 20 }]);

    const payload = await buildKpiCardsPayload(null);
    expect(payload.kpis).toBeDefined();
    expect(payload.kpis.todaySales).toBe(500);
    expect(payload.orders).toBeDefined();
    expect(payload.customers).toBeDefined();
    expect(payload.products).toBeDefined();
    expect(payload.inventory).toBeDefined();
  });

  it("buildSalesAnalyticsPayload returns series with filters", async () => {
    mockOrder.aggregate.mockResolvedValue([
      { _id: "2026-08-01", revenue: 1000, orders: 10, profit: 200, taxes: 50, shipping: 30, discounts: 20 },
      { _id: "2026-08-02", revenue: 1200, orders: 12, profit: 240, taxes: 60, shipping: 36, discounts: 24 },
    ]);

    const payload = await buildSalesAnalyticsPayload(null, "30days");
    expect(payload.filters).toEqual(expect.arrayContaining(["Today", "7 days", "30 days"]));
    expect(payload.series).toHaveLength(2);
    expect(payload.series[0].revenue).toBe(1000);
  });

  it("buildHealthScorePayload returns score between 0 and 100", async () => {
    mockProduct.countDocuments.mockResolvedValue(0);
    mockProductReview.countDocuments.mockResolvedValue(0);
    mockOrder.aggregate.mockResolvedValue([{ count: 0 }]);
    mockAuditLog.countDocuments.mockResolvedValue(0);
    mockStore.findOne.mockResolvedValue(null);

    const payload = await buildHealthScorePayload(null);
    expect(payload.score).toBeGreaterThanOrEqual(0);
    expect(payload.score).toBeLessThanOrEqual(100);
    expect(payload.breakdown).toBeDefined();
  });

  it("buildGoalsPayload returns progress and remainingOrders", async () => {
    mockOrder.aggregate.mockResolvedValueOnce([{ total: 5000 }]);
    mockOrder.aggregate.mockResolvedValueOnce([{ count: 10 }]);

    const payload = await buildGoalsPayload(null);
    expect(payload.progress).toBeGreaterThanOrEqual(0);
    expect(payload.progress).toBeLessThanOrEqual(100);
    expect(payload.remainingOrders).toBeGreaterThanOrEqual(0);
  });

  it("buildConversionFunnelPayload returns funnel steps", async () => {
    mockCustomer.countDocuments.mockResolvedValue(100);
    mockOrder.aggregate.mockResolvedValueOnce([{ count: 20 }]);

    const payload = await buildConversionFunnelPayload(null);
    expect(payload.visitors).toBeGreaterThanOrEqual(0);
    expect(payload.cartAdditions).toBeGreaterThanOrEqual(0);
    expect(payload.checkoutStarted).toBeGreaterThanOrEqual(0);
    expect(payload.paymentsSucceeded).toBeGreaterThanOrEqual(0);
  });

  it("buildQuickActionsPayload returns action list", () => {
    const actions = buildQuickActionsPayload();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]).toHaveProperty("id");
    expect(actions[0]).toHaveProperty("label");
    expect(actions[0]).toHaveProperty("action");
  });
});
