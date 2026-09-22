const mongoose = require("mongoose");
const GracePeriodService = require("../../src/service/GracePeriodService");

describe("GracePeriodService", () => {
  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe("getGracePeriods", () => {
    it("should return paginated grace periods list", async () => {
      const result = await GracePeriodService.getGracePeriods({ page: 1, limit: 20 });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toHaveProperty("total");
      expect(result.pagination).toHaveProperty("page");
      expect(result.pagination).toHaveProperty("limit");
      expect(result.pagination).toHaveProperty("pages");
    });
  });

  describe("getActiveGracePeriods", () => {
    it("should return active grace periods", async () => {
      const result = await GracePeriodService.getActiveGracePeriods();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("expireGracePeriods", () => {
    it("should process expired grace periods", async () => {
      const result = await GracePeriodService.expireGracePeriods();
      expect(result).toBeDefined();
    });
  });
});