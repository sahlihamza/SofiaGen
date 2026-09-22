const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const Store = require("../models/Store");
const Plan = require("../models/Plan");
const PlanVersion = require("../models/PlanVersion");
const PlanPrice = require("../models/PlanPrice");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const UsageCounter = require("../models/UsageCounter");
const UsageThresholdEvent = require("../models/UsageThresholdEvent");
const PlanChangeRequest = require("../models/PlanChangeRequest");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const AuditLog = require("../models/AuditLog");

const Proration = require("../service/ProrationService");
const UsageService = require("../service/UsageService");
const PlanChangeService = require("../service/PlanChangeService");
const Catalog = require("../service/PlanCatalogService");
const { requireQuota } = require("../middleware/quotaGuard");
const { resetMonthlyUsage, RESETTABLE_RESOURCES } = require("../jobs/usageResetJob");

const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const created = { stores: [], plans: [], subs: [] };

const PERIOD_START = new Date("2026-01-01T00:00:00Z");
const PERIOD_END = new Date("2026-02-01T00:00:00Z");

const SUB_PERIOD_START = new Date(Date.now() - 15 * 86400000);
const SUB_PERIOD_END = new Date(Date.now() + 15 * 86400000);

const makeStore = async () => {
  const s = await Store.create({ name: uid("store"), status: "active" });
  created.stores.push(s._id);
  return s;
};

const makePlan = async ({ price = 100, quotas = [] } = {}) => {
  const plan = await Catalog.createPlan({ name: uid("plan"), slug: uid("plan").toLowerCase() });
  created.plans.push(plan._id);

  const version = await Catalog.createVersion(plan._id, {
    featureRefs: [{ code: "builder", enabled: true }],
    quotaRefs: quotas,
  });
  await Catalog.publishVersion(plan._id, version._id);

  await PlanPrice.create({
    planId: plan._id,
    currency: "USD",
    cycle: "monthly",
    price,
    status: "active",
    effectiveFrom: new Date("2025-01-01"),
  });

  return { plan: await Plan.findById(plan._id), version };
};

const makeSub = async (store, plan, { unitPrice = 100 } = {}) => {
  const version = await PlanVersion.findById(plan.currentVersionId);
  const price = await PlanPrice.findOne({ planId: plan._id, cycle: "monthly", currency: "USD" });
  const s = await Subscription.create({
    storeId: store._id,
    planId: plan._id,
    planVersionId: version._id,
    planPriceId: price._id,
    status: "active",
    billingCycle: "monthly",
    currency: "USD",
    unitPrice,
    finalPrice: unitPrice,
    basePriceInCurrency: unitPrice,
    currentPeriodStart: SUB_PERIOD_START,
    currentPeriodEnd: SUB_PERIOD_END,
  });
  created.subs.push(s._id);
  return s;
};

const seedCounter = async (store, quotaTypeCode, used) => {
  await UsageCounter.updateOne(
    { storeId: store._id, quotaTypeCode, periodStart: SUB_PERIOD_START, periodEnd: SUB_PERIOD_END },
    { $set: { used } },
    { upsert: true }
  );
};

test.before(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  await UsageThresholdEvent.syncIndexes();
  await PlanChangeRequest.syncIndexes();
});

test.after(async () => {
  await Promise.all([
    UsageThresholdEvent.deleteMany({ storeId: { $in: created.stores } }),
    UsageCounter.deleteMany({ storeId: { $in: created.stores } }),
    PlanChangeRequest.deleteMany({ storeId: { $in: created.stores } }),
    SubscriptionEvent.deleteMany({ storeId: { $in: created.stores } }),
    Invoice.deleteMany({ storeId: { $in: created.stores } }),
    AuditLog.deleteMany({ storeId: { $in: created.stores } }),
    Subscription.deleteMany({ storeId: { $in: created.stores } }),
    PlanPrice.deleteMany({ planId: { $in: created.plans } }),
    PlanVersion.deleteMany({ planId: { $in: created.plans } }),
    Plan.deleteMany({ _id: { $in: created.plans } }),
    Store.deleteMany({ _id: { $in: created.stores } }),
  ]);
  await mongoose.connection.close();
});

/* ---------------- PARTIE A : proration ---------------- */

test("proration: milieu de periode, credit et charge au prorata des jours restants", () => {
  const r = Proration.calculateProration({
    oldPrice: 31,
    newPrice: 62,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    changeDate: new Date("2026-01-16T00:00:00Z"),
  });
  assert.equal(r.totalDays, 31);
  assert.equal(r.remainingDays, 16);
  assert.equal(r.usedDays, 15);
  assert.equal(r.credit, 16);
  assert.equal(r.newCharge, 32);
  assert.equal(r.amountDue, 16);
  assert.equal(r.direction, "upgrade");
});

test("proration: remainingDays = 0 le dernier jour, montant du nul", () => {
  const r = Proration.calculateProration({
    oldPrice: 31,
    newPrice: 62,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    changeDate: PERIOD_END,
  });
  assert.equal(r.remainingDays, 0);
  assert.equal(r.credit, 0);
  assert.equal(r.newCharge, 0);
  assert.equal(r.amountDue, 0);
  assert.equal(r.direction, "neutral");
});

test("proration: changeDate = periodStart, credit quasi total", () => {
  const r = Proration.calculateProration({
    oldPrice: 31,
    newPrice: 62,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    changeDate: PERIOD_START,
  });
  assert.equal(r.remainingDays, 31);
  assert.equal(r.usedDays, 0);
  assert.equal(r.credit, 31, "tout l ancien plan est rembourse");
  assert.equal(r.amountDue, 31);
});

test("proration: downgrade produit un montant du negatif", () => {
  const r = Proration.calculateProration({
    oldPrice: 62,
    newPrice: 31,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    changeDate: new Date("2026-01-16T00:00:00Z"),
  });
  assert.ok(r.amountDue < 0);
  assert.equal(r.direction, "downgrade");
});

test("proration: devises differentes sans taux refusees, avec taux converties", () => {
  const args = {
    oldPrice: 10,
    newPrice: 20,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    changeDate: new Date("2026-01-16T00:00:00Z"),
    oldCurrency: "EUR",
    newCurrency: "USD",
  };

  assert.throws(
    () => Proration.calculateProration(args),
    (e) => e.code === "PRORATION_CURRENCY_MISMATCH"
  );

  const r = Proration.calculateProration({ ...args, conversionRate: 1.1 });
  assert.equal(r.currency, "USD");
  assert.equal(r.convertedFrom.currency, "EUR");
  assert.equal(r.convertedFrom.conversionRate, 1.1);
});

test("proration: cycle annuel, 365 jours et arrondi a 2 decimales", () => {
  const r = Proration.calculateProration({
    oldPrice: 1200,
    newPrice: 2400,
    periodStart: new Date("2026-01-01T00:00:00Z"),
    periodEnd: new Date("2027-01-01T00:00:00Z"),
    changeDate: new Date("2026-07-01T00:00:00Z"),
  });
  assert.equal(r.totalDays, 365);
  assert.equal(Math.round(r.amountDue * 100) / 100, r.amountDue, "montant arrondi a 2 decimales");
  assert.ok(r.amountDue > 0);
});

test("proration: entrees invalides refusees", () => {
  assert.throws(
    () => Proration.calculateProration({ oldPrice: 10, newPrice: 20, periodStart: PERIOD_END, periodEnd: PERIOD_START }),
    (e) => e.code === "PRORATION_INVALID_INPUT"
  );
  assert.throws(
    () =>
      Proration.calculateProration({
        oldPrice: -5,
        newPrice: 20,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
        changeDate: PERIOD_START,
      }),
    (e) => e.code === "PRORATION_INVALID_INPUT"
  );
});

/* ---------------- PARTIE B : usage et quotas ---------------- */

test("usage: increment sous la limite passe et renvoie le restant", async () => {
  const store = await makeStore();
  const { plan } = await makePlan({ quotas: [{ quotaTypeCode: "products", limitValue: 5, isUnlimited: false }] });
  await makeSub(store, plan);

  const r = await UsageService.tryIncrementUsage(store._id, "products", 1);
  assert.equal(r.allowed, true);
  assert.equal(r.current, 1);
  assert.equal(r.limit, 5);
  assert.equal(r.remaining, 4);
});

test("usage: depassement refuse avec QUOTA_EXCEEDED en 403", async () => {
  const store = await makeStore();
  const { plan } = await makePlan({ quotas: [{ quotaTypeCode: "products", limitValue: 2, isUnlimited: false }] });
  await makeSub(store, plan);

  await UsageService.tryIncrementUsage(store._id, "products", 1);
  await UsageService.tryIncrementUsage(store._id, "products", 1);

  await assert.rejects(
    () => UsageService.tryIncrementUsage(store._id, "products", 1),
    (e) => e.code === "QUOTA_EXCEEDED" && e.status === 403 && e.resource === "products"
  );

  const counter = await UsageCounter.findOne({ storeId: store._id, quotaTypeCode: "products" });
  assert.equal(counter.used, 2, "le compteur ne doit jamais depasser la limite");
});

test("usage: quota illimite n est jamais bloque", async () => {
  const store = await makeStore();
  const { plan } = await makePlan({ quotas: [{ quotaTypeCode: "orders", limitValue: null, isUnlimited: true }] });
  await makeSub(store, plan);

  for (let i = 0; i < 5; i += 1) {
    const r = await UsageService.tryIncrementUsage(store._id, "orders", 1);
    assert.equal(r.allowed, true);
    assert.equal(r.unlimited, true);
  }
});

test("concurrence: 2 requetes simultanees sur 1 place restante, exactement 1 acceptee", async () => {
  const store = await makeStore();
  const { plan } = await makePlan({ quotas: [{ quotaTypeCode: "products", limitValue: 3, isUnlimited: false }] });
  await makeSub(store, plan);
  await seedCounter(store, "products", 2);

  const results = await Promise.allSettled([
    UsageService.tryIncrementUsage(store._id, "products", 1),
    UsageService.tryIncrementUsage(store._id, "products", 1),
  ]);

  const ok = results.filter((r) => r.status === "fulfilled");
  const ko = results.filter((r) => r.status === "rejected");
  assert.equal(ok.length, 1, "exactement une requete doit passer");
  assert.equal(ko.length, 1);
  assert.equal(ko[0].reason.code, "QUOTA_EXCEEDED");

  const counter = await UsageCounter.findOne({ storeId: store._id, quotaTypeCode: "products" });
  assert.equal(counter.used, 3);
});

test("concurrence: 8 requetes simultanees sur 3 places, exactement 3 acceptees", async () => {
  const store = await makeStore();
  const { plan } = await makePlan({ quotas: [{ quotaTypeCode: "products", limitValue: 3, isUnlimited: false }] });
  await makeSub(store, plan);

  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () => UsageService.tryIncrementUsage(store._id, "products", 1))
  );

  assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
  const counter = await UsageCounter.findOne({ storeId: store._id, quotaTypeCode: "products" });
  assert.equal(counter.used, 3, "le compteur ne depasse jamais la limite sous concurrence");
});

test("usage: releaseQuota rend la place apres un echec metier", async () => {
  const store = await makeStore();
  const { plan } = await makePlan({ quotas: [{ quotaTypeCode: "products", limitValue: 2, isUnlimited: false }] });
  await makeSub(store, plan);

  await UsageService.tryIncrementUsage(store._id, "products", 1);
  const after = await UsageService.releaseQuota(store._id, "products", 1);
  assert.equal(after, 0, "la place doit etre rendue");
});

test("seuils: 80/90/100% emis une seule fois par periode", async () => {
  const store = await makeStore();
  const { plan } = await makePlan({ quotas: [{ quotaTypeCode: "products", limitValue: 10, isUnlimited: false }] });
  await makeSub(store, plan);

  for (let i = 0; i < 10; i += 1) {
    await UsageService.tryIncrementUsage(store._id, "products", 1);
  }

  const events = await UsageThresholdEvent.find({ storeId: store._id, quotaTypeCode: "products" });
  const thresholds = events.map((e) => e.threshold).sort((a, b) => a - b);
  assert.deepEqual(thresholds, [80, 90, 100], "les trois seuils doivent avoir ete emis");

  const duplicates = await UsageThresholdEvent.countDocuments({
    storeId: store._id,
    quotaTypeCode: "products",
    threshold: 80,
  });
  assert.equal(duplicates, 1, "aucun doublon sur la meme periode");
});

test("quotaGuard: middleware renvoie 403 QUOTA_EXCEEDED et laisse passer sinon", async () => {
  const store = await makeStore();
  const { plan } = await makePlan({ quotas: [{ quotaTypeCode: "products", limitValue: 1, isUnlimited: false }] });
  await makeSub(store, plan);

  const mw = requireQuota("products");
  const mkRes = () => {
    const res = { statusCode: null, body: null };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
  };

  const req1 = { storeId: store._id };
  let passed = false;
  await mw(req1, mkRes(), () => { passed = true; });
  assert.equal(passed, true, "sous la limite, next() doit etre appele");
  assert.equal(req1.quotaResult.current, 1);

  const req2 = { storeId: store._id };
  const res2 = mkRes();
  await mw(req2, res2, () => { throw new Error("next ne doit pas etre appele"); });
  assert.equal(res2.statusCode, 403);
  assert.equal(res2.body.code, "QUOTA_EXCEEDED");
});

/* ---------------- PARTIE A : pipeline changement de plan ---------------- */

test("planChange: upgrade cree une facture de prorata et deplace le snapshot", async () => {
  const store = await makeStore();
  const { plan: oldPlan } = await makePlan({ price: 31 });
  const { plan: newPlan, version: newVersion } = await makePlan({ price: 62 });
  const sub = await makeSub(store, oldPlan, { unitPrice: 31 });

  const result = await PlanChangeService.changePlan({
    subscriptionId: sub._id,
    newPlanId: newPlan._id,
    idempotencyKey: uid("key"),
    skipEligibility: true,
  });

  assert.equal(result.request.status, "completed");
  assert.ok(result.amountDue >= 0);

  const fresh = await Subscription.findById(sub._id);
  assert.equal(String(fresh.planId), String(newPlan._id));
  assert.equal(String(fresh.planVersionId), String(newVersion._id));
  assert.equal(fresh.unitPrice, 62, "le nouveau prix est fige sur la subscription");
});

test("planChange: double appel avec la meme idempotencyKey ne cree qu une seule facture", async () => {
  const store = await makeStore();
  const { plan: oldPlan } = await makePlan({ price: 31 });
  const { plan: newPlan } = await makePlan({ price: 62 });
  const sub = await makeSub(store, oldPlan, { unitPrice: 31 });

  const key = uid("idem");
  const first = await PlanChangeService.changePlan({
    subscriptionId: sub._id,
    newPlanId: newPlan._id,
    idempotencyKey: key,
    skipEligibility: true,
  });
  assert.equal(first.replayed, false);

  const second = await PlanChangeService.changePlan({
    subscriptionId: sub._id,
    newPlanId: newPlan._id,
    idempotencyKey: key,
    skipEligibility: true,
  });
  assert.equal(second.replayed, true, "le 2e appel doit rejouer la requete existante");

  const invoices = await Invoice.countDocuments({
    storeId: store._id,
    "metadata.idempotencyKey": key,
  });
  assert.equal(invoices, 1, "une seule facture malgre le double clic");

  const requests = await PlanChangeRequest.countDocuments({ idempotencyKey: key });
  assert.equal(requests, 1);
});

test("planChange: downgrade refuse si l usage depasse le quota cible", async () => {
  const store = await makeStore();
  const { plan: bigPlan } = await makePlan({
    price: 100,
    quotas: [{ quotaTypeCode: "products", limitValue: 100, isUnlimited: false }],
  });
  const { plan: smallPlan } = await makePlan({
    price: 20,
    quotas: [{ quotaTypeCode: "products", limitValue: 5, isUnlimited: false }],
  });
  const sub = await makeSub(store, bigPlan, { unitPrice: 100 });

  await seedCounter(store, "products", 42);

  await assert.rejects(
    () =>
      PlanChangeService.changePlan({
        subscriptionId: sub._id,
        newPlanId: smallPlan._id,
        idempotencyKey: uid("idem"),
        skipEligibility: true,
      }),
    (e) => e.code === "DOWNGRADE_USAGE_EXCEEDS_QUOTA" && /42/.test(e.message)
  );

  const fresh = await Subscription.findById(sub._id);
  assert.equal(String(fresh.planId), String(bigPlan._id), "le plan ne doit pas avoir change");
});

test("planChange: un echec laisse la requete en failed sans facture orpheline", async () => {
  const store = await makeStore();
  const { plan: bigPlan } = await makePlan({
    price: 100,
    quotas: [{ quotaTypeCode: "products", limitValue: 100, isUnlimited: false }],
  });
  const { plan: smallPlan } = await makePlan({
    price: 20,
    quotas: [{ quotaTypeCode: "products", limitValue: 1, isUnlimited: false }],
  });
  const sub = await makeSub(store, bigPlan, { unitPrice: 100 });
  await seedCounter(store, "products", 50);

  const key = uid("idem");
  await assert.rejects(() =>
    PlanChangeService.changePlan({
      subscriptionId: sub._id,
      newPlanId: smallPlan._id,
      idempotencyKey: key,
      skipEligibility: true,
    })
  );

  const request = await PlanChangeRequest.findOne({ idempotencyKey: key });
  assert.equal(request.status, "failed");
  assert.equal(request.failedStep, "usage_check");
  assert.equal(request.failureCode, "DOWNGRADE_USAGE_EXCEEDS_QUOTA");

  const invoices = await Invoice.countDocuments({ "metadata.idempotencyKey": key });
  assert.equal(invoices, 0, "aucune facture ne doit subsister apres un echec");
});

test("planChange: idempotencyKey manquante refusee", async () => {
  const store = await makeStore();
  const { plan } = await makePlan();
  const sub = await makeSub(store, plan);

  await assert.rejects(
    () => PlanChangeService.changePlan({ subscriptionId: sub._id, newPlanId: plan._id }),
    (e) => e.code === "IDEMPOTENCY_KEY_REQUIRED"
  );
});

test("planChange: changer vers le meme plan refuse", async () => {
  const store = await makeStore();
  const { plan } = await makePlan();
  const sub = await makeSub(store, plan);

  await assert.rejects(
    () =>
      PlanChangeService.changePlan({
        subscriptionId: sub._id,
        newPlanId: plan._id,
        idempotencyKey: uid("idem"),
        skipEligibility: true,
      }),
    (e) => e.code === "PLAN_UNCHANGED"
  );
});

/* ---------------- job de reset ---------------- */

test("resetJob: remet a zero les ressources mensuelles sans toucher aux cumulatives", async () => {
  const store = await makeStore();
  const { plan } = await makePlan();
  await makeSub(store, plan);

  await seedCounter(store, "orders", 40);
  await seedCounter(store, "products", 17);

  await resetMonthlyUsage({ reference: new Date("2026-03-01T00:05:00Z") });

  const orders = await UsageCounter.findOne({ storeId: store._id, quotaTypeCode: "orders" });
  const products = await UsageCounter.findOne({ storeId: store._id, quotaTypeCode: "products" });

  assert.equal(orders.used, 0, "orders est mensuel et doit etre remis a zero");
  assert.equal(products.used, 17, "products est cumulatif et ne doit pas bouger");
  assert.ok(RESETTABLE_RESOURCES.includes("orders"));
  assert.ok(!RESETTABLE_RESOURCES.includes("products"));
});
