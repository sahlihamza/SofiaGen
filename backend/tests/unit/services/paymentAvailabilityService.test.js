const mongoose = require("mongoose");

process.env.PAYMENT_ENCRYPTION_KEY =
  process.env.PAYMENT_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef";

const Store = require("../../../src/models/Store");
const Plan = require("../../../src/models/Plan");
const PaymentMethod = require("../../../src/models/payment/PaymentMethod");
const PaymentProvider = require("../../../src/models/payment/PaymentProvider");
const PaymentMethodProviderLink = require("../../../src/models/payment/PaymentMethodProviderLink");
const PaymentRule = require("../../../src/models/payment/PaymentRule");
const PaymentSettings = require("../../../src/models/PaymentSettings");
const PaymentAvailabilityService = require("../../../src/service/paymentAvailabilityService");

describe("PaymentAvailabilityService", () => {
  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
  });

  beforeEach(async () => {
    await Promise.all([
      Store.deleteMany({}),
      Plan.deleteMany({}),
      PaymentMethod.deleteMany({}),
      PaymentProvider.deleteMany({}),
      PaymentMethodProviderLink.deleteMany({}),
      PaymentRule.deleteMany({}),
      PaymentSettings.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  });

  it("should return available payment methods with active provider links", async () => {
    const plan = await Plan.create({
      name: "Test Plan",
      slug: "test-plan",
      pricing: { monthly: 25, yearly: 250, currency: "USD" },
      status: "active",
    });

    const store = await Store.create({
      name: "Test Store",
      currency: "USD",
      planId: plan._id,
      planName: plan.name,
      planSlug: plan.slug,
      status: "active",
    });

    const stripeMethod = await PaymentMethod.create({
      code: "stripe",
      name: { en: "Stripe" },
      description: { en: "Pay with Stripe" },
      type: "online",
      displayOrder: 0,
      status: "active",
    });

    const bankMethod = await PaymentMethod.create({
      code: "bank_transfer",
      name: { en: "Bank Transfer" },
      description: { en: "Pay by bank transfer" },
      type: "offline",
      displayOrder: 1,
      status: "active",
    });

    const provider = await PaymentProvider.create({
      code: "stripe_provider",
      name: "Stripe Provider",
      status: "active",
      supportsSubscription: true,
      supportsRefund: true,
    });

    await PaymentMethodProviderLink.create({
      paymentMethodId: stripeMethod._id,
      paymentProviderId: provider._id,
      priority: 0,
      status: "active",
    });

    await PaymentRule.create({
      paymentProviderId: provider._id,
      countries: [],
      currencies: ["USD"],
      planIds: [plan._id],
      supportsOneTime: true,
      supportsSubscription: true,
      supportsRefund: true,
      priority: 0,
      status: "active",
    });

    await PaymentSettings.create({
      storeId: store._id,
      methods: [
        {
          key: "stripe",
          title: "Stripe",
          description: "Pay with Stripe",
          enabled: true,
          order: 0,
          config: {},
        },
        {
          key: "bank_transfer",
          title: "Bank Transfer",
          description: "Pay by bank transfer",
          enabled: true,
          order: 1,
          config: {},
        },
      ],
    });

    const methods = await PaymentAvailabilityService.getAvailablePaymentMethodsForStore(store._id, plan._id, {
      isSubscription: true,
    });

    expect(Array.isArray(methods)).toBe(true);
    const stripeResult = methods.find((m) => m.code === "stripe");
    const bankResult = methods.find((m) => m.code === "bank_transfer");

    expect(stripeResult).toBeDefined();
    expect(stripeResult.enabled).toBe(true);
    expect(Array.isArray(stripeResult.providers)).toBe(true);
    expect(stripeResult.providers).toHaveLength(1);
    expect(stripeResult.providers[0].code).toBe("stripe_provider");
    expect(stripeResult.isAvailable).toBe(true);

    expect(bankResult).toBeDefined();
    expect(bankResult.isAvailable).toBe(true);
    expect(Array.isArray(bankResult.providers)).toBe(true);
    expect(bankResult.providers).toHaveLength(0);
  });

  it("should throw StoreNotFound if the store does not exist", async () => {
    await expect(
      PaymentAvailabilityService.getAvailablePaymentMethodsForStore(
        mongoose.Types.ObjectId(),
        mongoose.Types.ObjectId()
      )
    ).rejects.toThrow("Store not found");
  });
});
