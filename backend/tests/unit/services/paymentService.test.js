const mongoose = require("mongoose");
const PaymentService = require("../../src/service/PaymentService");

describe("PaymentService", () => {
  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe("getPayments", () => {
    it("should return paginated payments list", async () => {
      const result = await PaymentService.getPayments({ page: 1, limit: 20 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toHaveProperty("total");
      expect(result.pagination).toHaveProperty("page");
      expect(result.pagination).toHaveProperty("limit");
      expect(result.pagination).toHaveProperty("pages");
    });
  });

  describe("getSupportedGateways", () => {
    it("should return supported payment gateways", () => {
      const gateways = PaymentService.getSupportedGateways();
      expect(Array.isArray(gateways)).toBe(true);
      expect(gateways.length).toBeGreaterThan(0);
      gateways.forEach((gw) => {
        expect(gw).toHaveProperty("id");
        expect(gw).toHaveProperty("name");
        expect(gw).toHaveProperty("supportedCurrencies");
      });
    });
  });

  describe("validateGateway", () => {
    it("should validate Stripe gateway", () => {
      const gw = PaymentService.validateGateway("stripe", "USD");
      expect(gw.name).toBe("Stripe");
    });

    it("should throw error for unsupported gateway", () => {
      expect(() => PaymentService.validateGateway("unknown")).toThrow("not supported");
    });
  });

  describe("getPaymentStats", () => {
    it("should return payment statistics", async () => {
      const stats = await PaymentService.getPaymentStats();
      expect(stats).toHaveProperty("stats");
      expect(stats).toHaveProperty("totalPayments");
      expect(stats).toHaveProperty("totalPaidAmount");
    });
  });
});