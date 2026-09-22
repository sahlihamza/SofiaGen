const mongoose = require("mongoose");
const subscriptionController = require("../../src/controller/subscriptionController");

describe("SubscriptionController", () => {
  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe("getAllSubscriptions", () => {
    it("should return 200 with paginated subscriptions", async () => {
      const req = { query: { page: "1", limit: "20" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await subscriptionController.getAllSubscriptions(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Array) })
      );
    });
  });

  describe("getTrialSubscriptions", () => {
    it("should return 200 with trial subscriptions", async () => {
      const req = { query: { page: "1", limit: "20" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await subscriptionController.getTrialSubscriptions(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Array) })
      );
    });
  });
});