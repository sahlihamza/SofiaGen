const mongoose = require("mongoose");

process.env.PAYMENT_ENCRYPTION_KEY =
  process.env.PAYMENT_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef";

const PaymentMethod = require("../../src/models/payment/PaymentMethod");
const PaymentProvider = require("../../src/models/payment/PaymentProvider");
const PaymentMethodProviderLink = require("../../src/models/payment/PaymentMethodProviderLink");
const PaymentRule = require("../../src/models/payment/PaymentRule");

describe("Payment model schemas", () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
  });

  afterEach(async () => {
    await Promise.all([
      PaymentMethod.deleteMany({}),
      PaymentProvider.deleteMany({}),
      PaymentMethodProviderLink.deleteMany({}),
      PaymentRule.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  });

  test("PaymentMethod can be created with required fields", async () => {
    const method = await PaymentMethod.create({
      code: "credit_card",
      name: { en: "Credit Card", fr: "Carte bancaire" },
      description: { en: "Pay by credit card" },
      type: "online",
      displayOrder: 1,
      status: "active",
      compatibleCountries: ["TN"],
      compatibleCurrencies: ["TND"],
    });

    expect(method.code).toBe("credit_card");
    expect(method.name.en).toBe("Credit Card");
    expect(method.status).toBe("active");
    expect(method.compatibleCountries).toContain("TN");
    expect(method.compatibleCurrencies).toContain("TND");
  });

  test("PaymentProvider encrypts credentials and masks them in JSON output", async () => {
    const provider = await PaymentProvider.create({
      code: "flouci",
      name: "Flouci",
      apiKey: "sk_test_1234567890",
      secretKey: "secret_9876543210",
      webhookSecret: "whsec_1234567890",
      status: "active",
    });

    const fetched = await PaymentProvider.findById(provider._id);
    expect(fetched.apiKey).toBeUndefined();
    expect(fetched.secretKey).toBeUndefined();
    expect(fetched.webhookSecret).toBeUndefined();

    const fetchedWithSecrets = await PaymentProvider.findById(provider._id).select(
      "+apiKey +secretKey +webhookSecret"
    );
    expect(fetchedWithSecrets.apiKey).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
    expect(fetchedWithSecrets.secretKey).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
    expect(fetchedWithSecrets.webhookSecret).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);

    const json = fetchedWithSecrets.toJSON();
    expect(json.apiKey).toMatch(/^\*\*\*\*[0-9]{4}$/);
    expect(json.secretKey).toMatch(/^\*\*\*\*[0-9]{4}$/);
    expect(json.webhookSecret).toMatch(/^\*\*\*\*[0-9]{4}$/);
  });

  test("PaymentMethodProviderLink stores method/provider relationship and priority", async () => {
    const method = await PaymentMethod.create({
      code: "cash_on_delivery",
      name: { en: "Cash on Delivery" },
      type: "offline",
      status: "active",
    });

    const provider = await PaymentProvider.create({
      code: "konnect",
      name: "Konnect",
      status: "active",
    });

    const link = await PaymentMethodProviderLink.create({
      paymentMethodId: method._id,
      paymentProviderId: provider._id,
      priority: 10,
      status: "active",
    });

    expect(link.paymentMethodId.toString()).toBe(method._id.toString());
    expect(link.paymentProviderId.toString()).toBe(provider._id.toString());
    expect(link.priority).toBe(10);
    expect(link.status).toBe("active");
  });

  test("PaymentRule can be created with plan, country and currency restrictions", async () => {
    const provider = await PaymentProvider.create({
      code: "click_to_pay",
      name: "ClickToPay",
      status: "active",
    });

    const rule = await PaymentRule.create({
      paymentProviderId: provider._id,
      countries: ["TN"],
      currencies: ["TND"],
      planIds: [],
      supportsOneTime: true,
      supportsSubscription: false,
      supportsRefund: false,
      priority: 5,
      status: "active",
    });

    expect(rule.paymentProviderId.toString()).toBe(provider._id.toString());
    expect(rule.countries).toContain("TN");
    expect(rule.currencies).toContain("TND");
    expect(rule.supportsOneTime).toBe(true);
    expect(rule.supportsSubscription).toBe(false);
    expect(rule.status).toBe("active");
  });
});
