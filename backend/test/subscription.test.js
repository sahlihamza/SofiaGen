require("dotenv").config();
const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const Store = require("../src/models/Store");
const Plan = require("../src/models/Plan");
const Subscription = require("../src/models/Subscription");
const Payment = require("../src/models/Payment");
const Invoice = require("../src/models/Invoice");
const StoreUsage = require("../src/models/StoreUsage");
const QuotaType = require("../src/models/QuotaType");
const User = require("../src/models/User");
const Role = require("../src/models/Role");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

let testStoreId;
let testPlanId;
let testSubscriptionId;
let testPaymentId;
let testInvoiceId;
let testUserId;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);

  await Store.deleteMany({});
  await Plan.deleteMany({});
  await Subscription.deleteMany({});
  await Payment.deleteMany({});
  await Invoice.deleteMany({});
  await StoreUsage.deleteMany({});
  await QuotaType.deleteMany({});
  await User.deleteMany({});
  await Role.deleteMany({});

  const role = await Role.create({
    name: "admin",
    label: "Admin",
    description: "Admin role",
  });

  const user = await User.create({
    name: "Test User",
    email: "test@example.com",
    password: "$2a$10$hashedpasswordplaceholder",
    role: role._id,
    roleName: "admin",
    isActive: true,
    emailVerified: true,
  });
  testUserId = user._id;

  const store = await Store.create({
    name: "Test Store",
    slug: "test-store",
    domain: "test.example.com",
    status: "active",
    subscriptionStatus: "active",
  });
  testStoreId = store._id;

  const plan = await Plan.create({
    name: "Test Plan",
    slug: "test-plan",
    pricing: { monthly: 49, yearly: 490, currency: "USD", taxIncluded: false },
    features: { apiAccess: true, customBranding: false },
    limits: { products: 100, staff: 5 },
    status: "active",
  });
  testPlanId = plan._id;

  const subscription = await Subscription.create({
    storeId: testStoreId,
    planId: testPlanId,
    currentPlanName: plan.name,
    status: "active",
    billingCycle: "monthly",
    startedAt: new Date(),
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    priceSnapshot: {
      monthly: plan.pricing?.monthly,
      yearly: plan.pricing?.yearly,
      currency: plan.pricing?.currency,
      taxIncluded: plan.pricing?.taxIncluded,
    },
  });
  testSubscriptionId = subscription._id;

  const invoice = await Invoice.create({
    invoiceNumber: "INV-TEST-001",
    storeId: testStoreId,
    subscriptionId: testSubscriptionId,
    planId: testPlanId,
    items: [
      {
        description: `Plan: ${plan.name}`,
        quantity: 1,
        unitPrice: plan.pricing?.monthly,
        total: plan.pricing?.monthly,
      },
    ],
    subtotal: plan.pricing?.monthly,
    tax: 0,
    total: plan.pricing?.monthly,
    currency: "USD",
    status: "paid",
    paidAt: new Date(),
    issuedAt: new Date(),
  });
  testInvoiceId = invoice._id;

  const payment = await Payment.create({
    storeId: testStoreId,
    subscriptionId: testSubscriptionId,
    invoiceId: testInvoiceId,
    amount: plan.pricing?.monthly,
    currency: "USD",
    method: "stripe",
    status: "succeeded",
    transactionId: "txn_test_001",
    paidAt: new Date(),
  });
  testPaymentId = payment._id;

  const quotaType = await QuotaType.create({
    code: "products",
    name: "Products",
    description: "Number of products",
  });

  await StoreUsage.create({
    storeId: testStoreId,
    quotaTypeId: quotaType._id,
    used: 50,
  });
});

afterAll(async () => {
  await Store.deleteMany({});
  await Plan.deleteMany({});
  await Subscription.deleteMany({});
  await Payment.deleteMany({});
  await Invoice.deleteMany({});
  await StoreUsage.deleteMany({});
  await QuotaType.deleteMany({});
  await User.deleteMany({});
  await Role.deleteMany({});
  await mongoose.disconnect();
});

describe("Auth protection", () => {
  test("GET /api/billing/plans/subscriptions without token returns 401", async () => {
    const res = await request(app).get("/api/billing/plans/subscriptions");
    expect(res.statusCode).toBe(401);
  });

  test("POST /api/billing/plans/:id/assign without token returns 401", async () => {
    const res = await request(app)
      .post(`/api/billing/plans/${testPlanId}/assign`)
      .send({ storeId: testStoreId, billingCycle: "monthly" });
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/billing/plans/:id/subscriptions without token returns 401", async () => {
    const res = await request(app).get(
      `/api/billing/plans/${testPlanId}/subscriptions`
    );
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/billing/plans/:id/subscriptions/summary without token returns 401", async () => {
    const res = await request(app).get(
      `/api/billing/plans/${testPlanId}/subscriptions/summary`
    );
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/billing/plans/:id/affected-stores without token returns 401", async () => {
    const res = await request(app).get(
      `/api/billing/plans/${testPlanId}/affected-stores`
    );
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/billing/plans/:id/history without token returns 401", async () => {
    const res = await request(app).get(
      `/api/billing/plans/${testPlanId}/history`
    );
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/billing/plans/:id/audit-log without token returns 401", async () => {
    const res = await request(app).get(
      `/api/billing/plans/${testPlanId}/audit-log`
    );
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/billing/plans/usage without token returns 401", async () => {
    const res = await request(app).get("/api/billing/plans/usage");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/platform/payments without token returns 401", async () => {
    const res = await request(app).get("/api/platform/payments");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/platform/invoices/store/:storeId without token returns 401", async () => {
    const res = await request(app).get(
      `/api/platform/invoices/store/${testStoreId}`
    );
    expect(res.statusCode).toBe(401);
  });

  test("POST /api/platform/invoices/ without token returns 401", async () => {
    const res = await request(app)
      .post("/api/platform/invoices/")
      .send({
        subscriptionId: testSubscriptionId,
        planId: testPlanId,
        storeId: testStoreId,
        items: [{ description: "Test", quantity: 1, unitPrice: 49, total: 49 }],
        tax: 0,
        currency: "USD",
      });
    expect(res.statusCode).toBe(401);
  });

  test("POST /api/platform/invoices/:invoiceId/link-payment without token returns 401", async () => {
    const res = await request(app)
      .post(`/api/platform/invoices/${testInvoiceId}/link-payment`)
      .send({ paymentId: testPaymentId });
    expect(res.statusCode).toBe(401);
  });

  test("POST /api/billing/plans/:id/downgrade without token returns 401", async () => {
    const res = await request(app)
      .post(`/api/billing/plans/${testPlanId}/downgrade`)
      .send({ storeId: testStoreId, billingCycle: "monthly" });
    expect(res.statusCode).toBe(401);
  });
});

describe("Subscription model validation", () => {
  test("should have required fields", () => {
    const subscription = new Subscription({
      storeId: testStoreId,
      planId: testPlanId,
      currentPlanName: "Test Plan",
      status: "active",
      billingCycle: "monthly",
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialPeriod: false,
      priceSnapshot: {
        monthly: 49,
        yearly: 490,
        currency: "USD",
        taxIncluded: false,
      },
      isAutoRenew: true,
    });

    expect(subscription.storeId.toString()).toBe(testStoreId.toString());
    expect(subscription.planId.toString()).toBe(testPlanId.toString());
    expect(subscription.status).toBe("active");
    expect(subscription.billingCycle).toBe("monthly");
    expect(subscription.trialPeriod).toBe(false);
    expect(subscription.isAutoRenew).toBe(true);
  });

  test("should have startedAt and endedAt fields", () => {
    const subscription = new Subscription({
      storeId: testStoreId,
      planId: testPlanId,
      currentPlanName: "Test Plan",
      status: "active",
      startedAt: new Date(),
      endedAt: null,
    });

    expect(subscription.startedAt).toBeInstanceOf(Date);
    expect(subscription.endedAt).toBeNull();
  });

  test("should have trialPeriod field", () => {
    const subscription = new Subscription({
      storeId: testStoreId,
      planId: testPlanId,
      currentPlanName: "Test Plan",
      status: "trial",
      trialPeriod: true,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    expect(subscription.trialPeriod).toBe(true);
    expect(subscription.trialEndsAt).toBeInstanceOf(Date);
  });

  test("should have priceSnapshot with all pricing fields", () => {
    const subscription = new Subscription({
      storeId: testStoreId,
      planId: testPlanId,
      currentPlanName: "Test Plan",
      status: "active",
      billingCycle: "monthly",
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priceSnapshot: {
        monthly: 49,
        yearly: 490,
        currency: "USD",
        taxIncluded: false,
      },
    });

    expect(subscription.priceSnapshot.monthly).toBe(49);
    expect(subscription.priceSnapshot.yearly).toBe(490);
    expect(subscription.priceSnapshot.currency).toBe("USD");
    expect(subscription.priceSnapshot.taxIncluded).toBe(false);
  });
});

describe("Invoice model validation", () => {
  test("should have required fields", () => {
    const invoice = new Invoice({
      invoiceNumber: "INV-TEST-VALIDATION-001",
      storeId: testStoreId,
      subscriptionId: testSubscriptionId,
      planId: testPlanId,
      items: [
        {
          description: "Plan: Test Plan",
          quantity: 1,
          unitPrice: 49,
          total: 49,
        },
      ],
      subtotal: 49,
      tax: 0,
      total: 49,
      currency: "USD",
      status: "paid",
      paidAt: new Date(),
      issuedAt: new Date(),
    });

    expect(invoice.invoiceNumber).toBe("INV-TEST-VALIDATION-001");
    expect(invoice.storeId.toString()).toBe(testStoreId.toString());
    expect(invoice.subscriptionId.toString()).toBe(testSubscriptionId.toString());
    expect(invoice.total).toBe(49);
    expect(invoice.status).toBe("paid");
  });

  test("should require invoiceNumber to be provided", async () => {
    const invoice = new Invoice({
      storeId: testStoreId,
      subscriptionId: testSubscriptionId,
      planId: testPlanId,
      items: [
        {
          description: "Plan: Test Plan",
          quantity: 1,
          unitPrice: 49,
          total: 49,
        },
      ],
      subtotal: 49,
      tax: 0,
      total: 49,
      currency: "USD",
      status: "draft",
      issuedAt: new Date(),
    });

    await expect(invoice.save()).rejects.toThrow(/invoiceNumber/);
  });

  test("should have status enum values", () => {
    const validStatuses = ["draft", "paid", "pending", "overdue", "cancelled"];
    for (const status of validStatuses) {
      const invoice = new Invoice({
        invoiceNumber: `INV-STATUS-${status}`,
        storeId: testStoreId,
        subscriptionId: testSubscriptionId,
        planId: testPlanId,
        items: [
          {
            description: "Plan: Test Plan",
            quantity: 1,
            unitPrice: 49,
            total: 49,
          },
        ],
        subtotal: 49,
        tax: 0,
        total: 49,
        currency: "USD",
        status: status,
        issuedAt: new Date(),
      });
      expect(invoice.status).toBe(status);
    }
  });
});

describe("Payment model validation", () => {
  test("should have invoiceId field", () => {
    const payment = new Payment({
      storeId: testStoreId,
      subscriptionId: testSubscriptionId,
      invoiceId: testInvoiceId,
      amount: 49,
      currency: "USD",
      method: "stripe",
      status: "succeeded",
      transactionId: "txn_test_validation",
      paidAt: new Date(),
    });

    expect(payment.invoiceId.toString()).toBe(testInvoiceId.toString());
    expect(payment.amount).toBe(49);
    expect(payment.status).toBe("succeeded");
  });

  test("should have status enum values", () => {
    const validStatuses = ["pending", "succeeded", "failed", "refunded"];
    for (const status of validStatuses) {
      const payment = new Payment({
        storeId: testStoreId,
        subscriptionId: testSubscriptionId,
        invoiceId: testInvoiceId,
        amount: 49,
        currency: "USD",
        method: "stripe",
        status: status,
        transactionId: `txn_${status}`,
        paidAt: status === "succeeded" ? new Date() : null,
      });
      expect(payment.status).toBe(status);
    }
  });
});

describe("Plan model validation", () => {
  test("should have pricing fields", () => {
    const plan = new Plan({
      name: "Validation Plan",
      slug: "validation-plan",
      pricing: { monthly: 29, yearly: 290, currency: "EUR", taxIncluded: true },
      features: { apiAccess: true },
      limits: { products: 50 },
      status: "draft",
    });

    expect(plan.pricing.monthly).toBe(29);
    expect(plan.pricing.yearly).toBe(290);
    expect(plan.pricing.currency).toBe("EUR");
    expect(plan.pricing.taxIncluded).toBe(true);
  });

  test("should have status enum values", () => {
    const validStatuses = ["draft", "active", "archived"];
    for (const status of validStatuses) {
      const plan = new Plan({
        name: `Status Plan ${status}`,
        slug: `status-plan-${status}`,
        pricing: { monthly: 29, yearly: 290, currency: "USD", taxIncluded: false },
        features: { apiAccess: true },
        limits: { products: 50 },
        status: status,
      });
      expect(plan.status).toBe(status);
    }
  });
});

describe("Store model validation", () => {
  test("should have subscriptionStatus field", () => {
    const store = new Store({
      name: "Validation Store",
      slug: "validation-store",
      domain: "validation.example.com",
      status: "active",
      subscriptionStatus: "trialing",
    });

    expect(store.subscriptionStatus).toBe("trialing");
  });
});