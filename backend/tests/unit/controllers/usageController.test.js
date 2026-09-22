const mongoose = require("mongoose");
const usageController = require("../../src/controller/usageController");

describe("UsageController", () => {
  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe("getUsageSummary", () => {
    it("should return 200 with summary data", async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await usageController.getUsageSummary(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });
  });

  describe("listUsageCounters", () => {
    it("should return 200 with paginated counters", async () => {
      const req = { query: { page: "1", limit: "20" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await usageController.listUsageCounters(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Array) })
      );
    });
  });

  describe("getUsageHistory", () => {
    it("should return 200 with paginated history", async () => {
      const req = { query: { page: "1", limit: "20" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await usageController.getUsageHistory(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Array) })
      );
    });
  });
});