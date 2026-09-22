const mongoose = require("mongoose");
const UsageService = require("../../src/service/UsageService");

describe("UsageService", () => {
  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe("getSummary", () => {
    it("should return summary object with total, normal, warning, critical, blocked, storesWithUsage", async () => {
      const summary = await UsageService.getSummary();
      expect(summary).toHaveProperty("total");
      expect(summary).toHaveProperty("normal");
      expect(summary).toHaveProperty("warning");
      expect(summary).toHaveProperty("critical");
      expect(summary).toHaveProperty("blocked");
      expect(summary).toHaveProperty("storesWithUsage");
      expect(typeof summary.total).toBe("number");
      expect(typeof summary.normal).toBe("number");
    });
  });

  describe("getCounters", () => {
    it("should return paginated counters list", async () => {
      const result = await UsageService.listCounters({ page: 1, limit: 20 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toHaveProperty("total");
      expect(result.pagination).toHaveProperty("page");
      expect(result.pagination).toHaveProperty("limit");
      expect(result.pagination).toHaveProperty("pages");
    });
  });

  describe("getHistory", () => {
    it("should return paginated history list", async () => {
      const result = await UsageService.getHistory({ page: 1, limit: 20 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("increment", () => {
    it("should throw error for missing storeId", async () => {
      await expect(UsageService.increment({ quotaTypeCode: "test" })).rejects.toThrow("storeId is required");
    });

    it("should throw error for missing quotaTypeCode", async () => {
      await expect(UsageService.increment({ storeId: "test" })).rejects.toThrow("quotaTypeCode is required");
    });

    it("should return null for zero delta", async () => {
      const result = await UsageService.increment({ storeId: "test", quotaTypeCode: "test", delta: 0 });
      expect(result).toBeNull();
    });
  });
});