const mongoose = require("mongoose");
const SubscriptionService = require("../../src/service/SubscriptionService");

describe("SubscriptionService", () => {
  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe("getAllSubscriptions", () => {
    it("should return paginated subscriptions list", async () => {
      const result = await SubscriptionService.getAllSubscriptions({ page: 1, limit: 20 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toHaveProperty("total");
      expect(result.pagination).toHaveProperty("page");
      expect(result.pagination).toHaveProperty("limit");
      expect(result.pagination).toHaveProperty("pages");
    });
  });

  describe("getTrialSubscriptions", () => {
    it("should return paginated trial subscriptions", async () => {
      const result = await SubscriptionService.getTrialSubscriptions({ page: 1, limit: 20 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("getSubscriptionHistory", () => {
    it("should return paginated subscription history", async () => {
      const result = await SubscriptionService.getSubscriptionHistory({ page: 1, limit: 20 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("getAllSubscriptionHistory", () => {
    it("should return paginated global subscription history", async () => {
      const result = await SubscriptionService.getAllSubscriptionHistory({ page: 1, limit: 20 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("getAllSubscriptionEvents", () => {
    it("should return paginated subscription events", async () => {
      const result = await SubscriptionService.getAllSubscriptionEvents({ page: 1, limit: 20 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});