const mongoose = require("mongoose");
const InvoiceService = require("../../src/service/InvoiceService");

describe("InvoiceService", () => {
  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe("getInvoiceByNumber", () => {
    it("should throw error for non-existent invoice", async () => {
      await expect(InvoiceService.getInvoiceByNumber("NONEXISTENT")).rejects.toThrow("Invoice not found");
    });
  });

  describe("generatePDF", () => {
    it("should throw error for non-existent invoice", async () => {
      await expect(InvoiceService.generatePDF("nonexistent")).rejects.toThrow("Invoice not found");
    });
  });

  describe("getSupportedGateways", () => {
    it("PaymentService should return supported gateways", () => {
      const { getSupportedGateways } = require("../../src/service/PaymentService");
      const gateways = getSupportedGateways();
      expect(Array.isArray(gateways)).toBe(true);
      expect(gateways.length).toBeGreaterThan(0);
      gateways.forEach((gw) => {
        expect(gw).toHaveProperty("id");
        expect(gw).toHaveProperty("name");
        expect(gw).toHaveProperty("supportedCurrencies");
      });
    });
  });
});