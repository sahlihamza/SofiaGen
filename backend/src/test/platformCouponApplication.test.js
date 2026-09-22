const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const PlatformCoupon = require("../models/PlatformCoupon");
const PlatformCouponRedemption = require("../models/PlatformCouponRedemption");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const Store = require("../models/Store");
const Plan = require("../models/Plan");
const service = require("../service/platformCouponApplicationService");

const unique = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

const created = {
  coupons: [],
  subscriptions: [],
  invoices: [],
  stores: [],
  plans: [],
};

const makeStore = async () => {
  const store = await Store.create({ name: unique("store"), slug: unique("slug").toLowerCase() });
  created.stores.push(store._id);
  return store;
};

const makePlan = async () => {
  const plan = await Plan.create({
    name: unique("plan"),
    slug: unique("plan").toLowerCase(),
    pricing: { monthly: 100, yearly: 1000, currency: "USD" },
  });
  created.plans.push(plan._id);
  return plan;
};

const makeSubscription = async (store, plan, extra = {}) => {
  const subscription = await Subscription.create({
    storeId: store._id,
    planId: plan._id,
    status: "pending",
    billingCycle: "monthly",
    currency: "USD",
    basePriceInCurrency: 100,
    priceSnapshot: { monthly: 100, yearly: 1000, currency: "USD" },
    ...extra,
  });
  created.subscriptions.push(subscription._id);
  return subscription;
};

const makeInvoice = async (store, plan, subscription, baseAmount = 100) => {
  const invoice = await Invoice.create({
    invoiceNumber: unique("INV"),
    storeId: store._id,
    subscriptionId: subscription._id,
    planId: plan._id,
    items: [{ description: "Plan", quantity: 1, unitPrice: baseAmount, total: baseAmount }],
    baseAmount,
    discounts: [],
    subtotal: baseAmount,
    taxRate: 0,
    tax: 0,
    total: baseAmount,
    currency: "USD",
    status: "draft",
  });
  created.invoices.push(invoice._id);
  return invoice;
};

const makeCoupon = async (overrides = {}) => {
  const coupon = await PlatformCoupon.create({
    code: unique("CPN"),
    title: "Test coupon",
    discountType: "percentage",
    discountValue: 10,
    status: "active",
    ...overrides,
  });
  created.coupons.push(coupon._id);
  return coupon;
};

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  await PlatformCouponRedemption.syncIndexes();
});

test.after(async () => {
  await Promise.all([
    PlatformCouponRedemption.deleteMany({ couponId: { $in: created.coupons } }),
    PlatformCoupon.deleteMany({ _id: { $in: created.coupons } }),
    Subscription.deleteMany({ _id: { $in: created.subscriptions } }),
    Invoice.deleteMany({ _id: { $in: created.invoices } }),
    Store.deleteMany({ _id: { $in: created.stores } }),
    Plan.deleteMany({ _id: { $in: created.plans } }),
  ]);
  await mongoose.connection.close();
});

test("computeDiscountAmount: percentage et fixed, jamais au-dessus de la base", () => {
  const { computeDiscountAmount } = service;
  assert.equal(computeDiscountAmount({ discountType: "percentage", discountValue: 25 }, 200), 50);
  assert.equal(computeDiscountAmount({ discountType: "fixed", discountValue: 30 }, 200), 30);
  assert.equal(computeDiscountAmount({ discountType: "fixed", discountValue: 500 }, 200), 200);
  assert.equal(computeDiscountAmount({ discountType: "percentage", discountValue: 10 }, 0), 0);
});

test("apply reduit reellement le montant facture", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subscription = await makeSubscription(store, plan);
  const invoice = await makeInvoice(store, plan, subscription, 100);
  const coupon = await makeCoupon({ discountType: "percentage", discountValue: 20 });

  const result = await service.apply({ code: coupon.code, subscriptionId: subscription._id });

  assert.equal(result.discountAmount, 20);
  assert.equal(result.invoice.subtotal, 80);
  assert.equal(result.invoice.total, 80);

  const reloaded = await Invoice.findById(invoice._id);
  assert.equal(reloaded.total, 80, "le total en base doit etre reduit");
  assert.equal(reloaded.discounts.length, 1);

  const sub = await Subscription.findById(subscription._id);
  assert.equal(sub.appliedCoupons.length, 1);
  assert.equal(sub.appliedCoupons[0].discountAmount, 20);
});

test("coupon fixed applique sur une facture ne casse pas la validation", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subscription = await makeSubscription(store, plan);
  await makeInvoice(store, plan, subscription, 100);
  const coupon = await makeCoupon({ discountType: "fixed", discountValue: 15 });

  const result = await service.apply({ code: coupon.code, subscriptionId: subscription._id });
  assert.equal(result.invoice.total, 85);
});

test("planIds: coupon limite a un plan refuse sur un autre plan", async () => {
  const store = await makeStore();
  const planA = await makePlan();
  const planB = await makePlan();
  const subscription = await makeSubscription(store, planB);
  const coupon = await makeCoupon({ planIds: [planA._id] });

  await assert.rejects(
    () => service.apply({ code: coupon.code, subscriptionId: subscription._id }),
    (err) => err.code === "COUPON_PLAN_NOT_ELIGIBLE"
  );

  const fresh = await PlatformCoupon.findById(coupon._id);
  assert.equal(fresh.usedCount, 0, "un refus ne doit pas consommer d'usage");
});

test("planIds: coupon limite au bon plan est accepte", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subscription = await makeSubscription(store, plan);
  const coupon = await makeCoupon({ planIds: [plan._id] });

  const result = await service.apply({ code: coupon.code, subscriptionId: subscription._id });
  assert.ok(result.redemption);
});

test("second apply du meme code sur la meme subscription est refuse", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subscription = await makeSubscription(store, plan);
  const coupon = await makeCoupon();

  await service.apply({ code: coupon.code, subscriptionId: subscription._id });

  await assert.rejects(
    () => service.apply({ code: coupon.code, subscriptionId: subscription._id }),
    (err) => err.code === "COUPON_ALREADY_APPLIED"
  );

  const fresh = await PlatformCoupon.findById(coupon._id);
  assert.equal(fresh.usedCount, 1, "le refus ne doit pas incrementer une 2e fois");
});

test("fenetre de validite: coupon expire refuse", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subscription = await makeSubscription(store, plan);
  const coupon = await makeCoupon({ endDate: new Date(Date.now() - 86400000) });

  await assert.rejects(
    () => service.apply({ code: coupon.code, subscriptionId: subscription._id }),
    (err) => err.code === "COUPON_EXPIRED"
  );
});

test("usageLimitPerCustomer respecte par store", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subA = await makeSubscription(store, plan);
  const subB = await makeSubscription(store, plan, { status: "cancelled" });
  const coupon = await makeCoupon({ usageLimitPerCustomer: 1 });

  await service.apply({ code: coupon.code, subscriptionId: subA._id });

  await assert.rejects(
    () => service.apply({ code: coupon.code, subscriptionId: subB._id }),
    (err) => err.code === "COUPON_CUSTOMER_LIMIT_REACHED"
  );

  const fresh = await PlatformCoupon.findById(coupon._id);
  assert.equal(fresh.usedCount, 1, "l'usage global doit avoir ete rendu");
});

test("concurrence: deux applies simultanes sur le dernier usage, un seul reussit", async () => {
  const plan = await makePlan();
  const storeA = await makeStore();
  const storeB = await makeStore();
  const subA = await makeSubscription(storeA, plan);
  const subB = await makeSubscription(storeB, plan);
  const coupon = await makeCoupon({ usageLimit: 1 });

  const results = await Promise.allSettled([
    service.apply({ code: coupon.code, subscriptionId: subA._id }),
    service.apply({ code: coupon.code, subscriptionId: subB._id }),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  assert.equal(fulfilled.length, 1, "exactement un apply doit reussir");
  assert.equal(rejected.length, 1, "exactement un apply doit echouer");
  assert.equal(rejected[0].reason.code, "COUPON_USAGE_LIMIT_REACHED");

  const fresh = await PlatformCoupon.findById(coupon._id);
  assert.equal(fresh.usedCount, 1, "usedCount ne doit jamais depasser usageLimit");

  const redemptions = await PlatformCouponRedemption.countDocuments({
    couponId: coupon._id,
    status: "applied",
  });
  assert.equal(redemptions, 1);
});

test("concurrence: 8 applies simultanes sur usageLimit=3, exactement 3 reussissent", async () => {
  const plan = await makePlan();
  const coupon = await makeCoupon({ usageLimit: 3 });

  const subscriptions = [];
  for (let i = 0; i < 8; i += 1) {
    const store = await makeStore();
    subscriptions.push(await makeSubscription(store, plan));
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => service.apply({ code: coupon.code, subscriptionId: sub._id }))
  );

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  assert.equal(fulfilled.length, 3, "exactement 3 applies doivent reussir");

  for (const r of results.filter((x) => x.status === "rejected")) {
    assert.equal(r.reason.code, "COUPON_USAGE_LIMIT_REACHED");
  }

  const fresh = await PlatformCoupon.findById(coupon._id);
  assert.equal(fresh.usedCount, 3, "usedCount ne doit jamais depasser usageLimit");

  const redemptions = await PlatformCouponRedemption.countDocuments({
    couponId: coupon._id,
    status: "applied",
  });
  assert.equal(redemptions, 3);
});

test("concurrence: deux applies simultanes sur la meme subscription, un seul reussit", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subscription = await makeSubscription(store, plan);
  const coupon = await makeCoupon();

  const results = await Promise.allSettled([
    service.apply({ code: coupon.code, subscriptionId: subscription._id }),
    service.apply({ code: coupon.code, subscriptionId: subscription._id }),
  ]);

  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);

  const fresh = await PlatformCoupon.findById(coupon._id);
  assert.equal(fresh.usedCount, 1);
});

test("concurrence: usageLimitPerCustomer tient sous applies simultanes", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subA = await makeSubscription(store, plan);
  const subB = await makeSubscription(store, plan, { status: "cancelled" });
  const coupon = await makeCoupon({ usageLimitPerCustomer: 1 });

  const results = await Promise.allSettled([
    service.apply({ code: coupon.code, subscriptionId: subA._id }),
    service.apply({ code: coupon.code, subscriptionId: subB._id }),
  ]);

  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);

  const redemptions = await PlatformCouponRedemption.countDocuments({
    couponId: coupon._id,
    storeId: store._id,
    status: "applied",
  });
  assert.equal(redemptions, 1);

  const fresh = await PlatformCoupon.findById(coupon._id);
  assert.equal(fresh.usedCount, 1);
});

test("preview ne consomme aucun usage", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subscription = await makeSubscription(store, plan);
  await makeInvoice(store, plan, subscription, 200);
  const coupon = await makeCoupon({ discountType: "percentage", discountValue: 25 });

  const preview = await service.preview({ code: coupon.code, subscriptionId: subscription._id });

  assert.equal(preview.discountAmount, 50);
  assert.equal(preview.payableAmount, 150);

  const fresh = await PlatformCoupon.findById(coupon._id);
  assert.equal(fresh.usedCount, 0);
});

test("duration repeating porte periodsRemaining sur la redemption", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subscription = await makeSubscription(store, plan);
  const coupon = await makeCoupon({ duration: "repeating", durationInPeriods: 3 });

  const result = await service.apply({ code: coupon.code, subscriptionId: subscription._id });
  assert.equal(result.redemption.duration, "repeating");
  assert.equal(result.redemption.periodsRemaining, 3);
});

test("duration forever laisse periodsRemaining a null", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const subscription = await makeSubscription(store, plan);
  const coupon = await makeCoupon({ duration: "forever" });

  const result = await service.apply({ code: coupon.code, subscriptionId: subscription._id });
  assert.equal(result.redemption.periodsRemaining, null);
});

test("durationInPeriods obligatoire quand duration=repeating", async () => {
  await assert.rejects(
    () =>
      PlatformCoupon.create({
        code: unique("CPN"),
        title: "bad",
        discountType: "percentage",
        discountValue: 10,
        duration: "repeating",
      }),
    (err) => err.name === "ValidationError"
  );
});

test("pourcentage au-dessus de 100 refuse a l'ecriture", async () => {
  await assert.rejects(
    () =>
      PlatformCoupon.create({
        code: unique("CPN"),
        title: "bad",
        discountType: "percentage",
        discountValue: 150,
      }),
    (err) => err.name === "ValidationError"
  );
});
