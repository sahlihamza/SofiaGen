const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const Store = require("../models/Store");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const AuditLog = require("../models/AuditLog");
const GracePeriod = require("../models/GracePeriod");
const Overage = require("../models/Overage");
const OverageWaiver = require("../models/OverageWaiver");

const PlatformStoreService = require("../service/PlatformStoreService");
const Lifecycle = require("../service/subscriptionLifecycleService");
const InvoiceOps = require("../service/platformInvoiceOpsService");
const QuotaOps = require("../service/quotaOpsService");

const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const LONG_REASON = "motif suffisamment detaille pour passer la validation";

const created = { stores: [], plans: [], subs: [], invoices: [], grace: [], overages: [], waivers: [] };

const makeStore = async () => {
  const s = await Store.create({ name: uid("store"), status: "active" });
  created.stores.push(s._id);
  return s;
};

const makePlan = async () => {
  const p = await Plan.create({
    name: uid("plan"),
    slug: uid("plan").toLowerCase(),
    pricing: { monthly: 100, yearly: 1000, currency: "USD" },
  });
  created.plans.push(p._id);
  return p;
};

const makeSub = async (store, plan, status = "active") => {
  const s = await Subscription.create({
    storeId: store._id,
    planId: plan._id,
    status,
    billingCycle: "monthly",
    currency: "USD",
    basePriceInCurrency: 100,
    currentPeriodStart: new Date(Date.now() - 86400000),
    currentPeriodEnd: new Date(Date.now() + 86400000 * 20),
  });
  created.subs.push(s._id);
  return s;
};

const makeInvoice = async (store, plan, sub, status = "draft") => {
  const inv = await Invoice.create({
    invoiceNumber: uid("INV").toUpperCase(),
    storeId: store._id,
    subscriptionId: sub._id,
    planId: plan._id,
    items: [{ description: "Plan", quantity: 1, unitPrice: 100, total: 100 }],
    baseAmount: 100,
    subtotal: 100,
    total: 100,
    currency: "USD",
    status,
  });
  created.invoices.push(inv._id);
  return inv;
};

test.before(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  await OverageWaiver.syncIndexes();
});

test.after(async () => {
  await Promise.all([
    OverageWaiver.deleteMany({ _id: { $in: created.waivers } }),
    Overage.deleteMany({ _id: { $in: created.overages } }),
    GracePeriod.deleteMany({ _id: { $in: created.grace } }),
    Invoice.deleteMany({ _id: { $in: created.invoices } }),
    Subscription.deleteMany({ _id: { $in: created.subs } }),
    Plan.deleteMany({ _id: { $in: created.plans } }),
    AuditLog.deleteMany({ entityId: { $in: created.stores } }),
    Store.deleteMany({ _id: { $in: created.stores } }),
  ]);
  await mongoose.connection.close();
});

test("store: suspend sans motif est refuse (400)", async () => {
  const store = await makeStore();
  await assert.rejects(
    () => PlatformStoreService.suspendStore(store._id, { reason: "court" }),
    (e) => e.code === "BAD_REQUEST"
  );
  const fresh = await Store.findById(store._id);
  assert.equal(fresh.status, "active", "le store ne doit pas avoir change");
});

test("store: suspend avec motif applique le statut et audite en critical", async () => {
  const store = await makeStore();
  const updated = await PlatformStoreService.suspendStore(store._id, { reason: LONG_REASON });

  assert.equal(updated.status, "suspended");
  assert.equal(updated.suspensionReason, LONG_REASON);

  const log = await AuditLog.findOne({ entityId: store._id, action: "store.suspend" });
  assert.ok(log, "un audit doit exister");
  assert.equal(log.severity, "critical");
  assert.equal(log.reason, LONG_REASON, "le motif doit etre persiste sur l audit");
});

test("store: double suspend renvoie un conflit", async () => {
  const store = await makeStore();
  await PlatformStoreService.suspendStore(store._id, { reason: LONG_REASON });
  await assert.rejects(
    () => PlatformStoreService.suspendStore(store._id, { reason: LONG_REASON }),
    (e) => e.code === "CONFLICT"
  );
});

test("store: activate repasse actif et audite en low", async () => {
  const store = await makeStore();
  await PlatformStoreService.suspendStore(store._id, { reason: LONG_REASON });
  const updated = await PlatformStoreService.activateStore(store._id, {});

  assert.equal(updated.status, "active");
  const log = await AuditLog.findOne({ entityId: store._id, action: "store.activate" });
  assert.equal(log.severity, "low");
});

test("store: soft-delete exige un motif puis restore rend le statut anterieur", async () => {
  const store = await makeStore();
  await PlatformStoreService.suspendStore(store._id, { reason: LONG_REASON });

  await assert.rejects(
    () => PlatformStoreService.softDeleteStore(store._id, { reason: "x" }),
    (e) => e.code === "BAD_REQUEST"
  );

  const del = await PlatformStoreService.softDeleteStore(store._id, { reason: LONG_REASON });
  assert.equal(del.status, "deleted");

  const restored = await PlatformStoreService.restoreStore(store._id, {});
  assert.equal(restored.status, "suspended", "doit revenir au statut d avant suppression");
  assert.equal(restored.deletedAt, null);
});

test("store: updateStore ne peut plus changer le statut (contournement ferme)", async () => {
  const store = await makeStore();
  const updated = await PlatformStoreService.updateStore(store._id, { status: "suspended", name: "renomme" });
  assert.equal(updated.status, "active", "status doit etre ignore par update");
  assert.equal(updated.name, "renomme");
});

test("subscription: matrice de transitions", () => {
  assert.equal(Lifecycle.canTransition("pending", "trial"), true);
  assert.equal(Lifecycle.canTransition("trial", "active"), true);
  assert.equal(Lifecycle.canTransition("active", "past_due"), true);
  assert.equal(Lifecycle.canTransition("past_due", "suspended"), true);
  assert.equal(Lifecycle.canTransition("suspended", "canceled"), true);
  assert.equal(Lifecycle.canTransition("canceled", "active"), false);
  assert.equal(Lifecycle.canTransition("expired", "active"), false);
  assert.deepEqual(Lifecycle.TERMINAL_STATUSES.sort(), ["canceled", "expired"]);
});

test("subscription: transition interdite renvoie un conflit", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan, "canceled");

  await assert.rejects(
    () => Lifecycle.resumeSubscription(sub._id, {}),
    (e) => e.code === "CONFLICT"
  );
});

test("subscription: cancel immediate passe canceled, cancel at_period_end programme", async () => {
  const planA = await makePlan();
  const storeA = await makeStore();
  const subA = await makeSub(storeA, planA, "active");

  const immediate = await Lifecycle.cancelSubscription(subA._id, { mode: "immediate", reason: LONG_REASON });
  assert.equal(immediate.status, "canceled");
  assert.ok(immediate.cancelledAt, "cancelledAt doit etre renseigne");

  const storeB = await makeStore();
  const subB = await makeSub(storeB, planA, "active");
  const scheduled = await Lifecycle.cancelSubscription(subB._id, { mode: "at_period_end", reason: LONG_REASON });
  assert.equal(scheduled.status, "active", "at_period_end ne coupe pas immediatement");
  assert.equal(scheduled.cancelAtPeriodEnd, true);
  assert.ok(scheduled.scheduledCancellationAt);
});

test("subscription: cancel sans motif refuse, mode inconnu refuse", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan, "active");

  await assert.rejects(
    () => Lifecycle.cancelSubscription(sub._id, { mode: "immediate", reason: "court" }),
    (e) => e.code === "BAD_REQUEST"
  );
  await assert.rejects(
    () => Lifecycle.cancelSubscription(sub._id, { mode: "n_importe_quoi", reason: LONG_REASON }),
    (e) => e.code === "BAD_REQUEST"
  );
});

test("subscription: extend-trial refuse hors essai, accepte en essai", async () => {
  const plan = await makePlan();
  const storeA = await makeStore();
  const active = await makeSub(storeA, plan, "active");
  await assert.rejects(
    () => Lifecycle.extendTrial(active._id, { days: 5, reason: LONG_REASON }),
    (e) => e.code === "CONFLICT"
  );

  const storeB = await makeStore();
  const trial = await makeSub(storeB, plan, "trial");
  const extended = await Lifecycle.extendTrial(trial._id, { days: 7, reason: LONG_REASON });
  assert.ok(extended.trialEndsAt > new Date(), "la fin d essai doit etre dans le futur");

  await assert.rejects(
    () => Lifecycle.extendTrial(trial._id, { days: 0, reason: LONG_REASON }),
    (e) => e.code === "BAD_REQUEST"
  );
});

test("subscription: force-status contourne la matrice mais exige un motif et audite critical", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan, "canceled");

  await assert.rejects(
    () => Lifecycle.forceStatus(sub._id, { status: "active", reason: "court" }),
    (e) => e.code === "BAD_REQUEST"
  );

  const forced = await Lifecycle.forceStatus(sub._id, { status: "active", reason: LONG_REASON });
  assert.equal(forced.status, "active", "force doit passer outre canceled -> active");

  const log = await AuditLog.findOne({ entityId: sub._id, action: "subscription.force_status" });
  assert.ok(log);
  assert.equal(log.severity, "critical");
});

test("invoice: mark-paid respecte les preconditions et audite critical", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan, "active");
  const inv = await makeInvoice(store, plan, sub, "draft");

  await assert.rejects(
    () => InvoiceOps.markPaid(inv._id, { reason: "court" }),
    (e) => e.code === "BAD_REQUEST"
  );

  const paid = await InvoiceOps.markPaid(inv._id, { reason: LONG_REASON });
  assert.equal(paid.status, "paid");
  assert.ok(paid.paidAt);

  await assert.rejects(
    () => InvoiceOps.markPaid(inv._id, { reason: LONG_REASON }),
    (e) => e.code === "CONFLICT"
  );

  const log = await AuditLog.findOne({ entityId: inv._id, action: "invoice.mark_paid" });
  assert.equal(log.severity, "critical");
});

test("invoice: void interdit sur une facture payee", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan, "active");
  const inv = await makeInvoice(store, plan, sub, "paid");

  await assert.rejects(
    () => InvoiceOps.voidInvoice(inv._id, { reason: LONG_REASON }),
    (e) => e.code === "CONFLICT"
  );
});

test("invoice: void depuis draft annule la facture", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan, "active");
  const inv = await makeInvoice(store, plan, sub, "draft");

  const voided = await InvoiceOps.voidInvoice(inv._id, { reason: LONG_REASON });
  assert.equal(voided.status, "canceled");
  assert.equal(voided.metadata.voidReason, LONG_REASON);
});

test("grace: extend exige un motif, refuse si resolved, prolonge sinon", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan, "active");

  const grace = await GracePeriod.create({
    subscriptionId: sub._id,
    storeId: store._id,
    quotaTypeCode: "products",
    graceStartDate: new Date(),
    graceEndDate: new Date(Date.now() + 86400000),
    status: "active",
  });
  created.grace.push(grace._id);

  await assert.rejects(
    () => QuotaOps.extendGracePeriod(grace._id, { days: 5, reason: "court" }),
    (e) => e.code === "BAD_REQUEST"
  );

  const before = grace.graceEndDate.getTime();
  const extended = await QuotaOps.extendGracePeriod(grace._id, { days: 5, reason: LONG_REASON });
  assert.ok(extended.graceEndDate.getTime() > before, "la fin de grace doit reculer");

  extended.status = "resolved";
  await extended.save();
  await assert.rejects(
    () => QuotaOps.extendGracePeriod(grace._id, { days: 5, reason: LONG_REASON }),
    (e) => e.code === "CONFLICT"
  );
});

test("overage: waive cree une exoneration unique et exige un motif", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan, "active");

  const rule = await Overage.create({
    name: uid("rule"),
    quotaTypeCode: "products",
    appliesToAllPlans: true,
    threshold: 0,
    unitPrice: 2,
    status: "active",
  });
  created.overages.push(rule._id);

  await assert.rejects(
    () => QuotaOps.waiveOverage(rule._id, { subscriptionId: sub._id, reason: "court" }),
    (e) => e.code === "BAD_REQUEST"
  );

  const result = await QuotaOps.waiveOverage(rule._id, { subscriptionId: sub._id, reason: LONG_REASON });
  created.waivers.push(result.waiver._id);
  assert.equal(result.waiver.status, "waived");
  assert.equal(result.waiver.reason, LONG_REASON);
  assert.ok(result.totalAfter <= result.totalBefore, "le total ne doit jamais augmenter apres exoneration");

  await assert.rejects(
    () => QuotaOps.waiveOverage(rule._id, { subscriptionId: sub._id, reason: LONG_REASON }),
    (e) => e.code === "CONFLICT"
  );
});

test("quota-ops: overview renvoie une vue croisee paginee", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan, "active");

  const grace = await GracePeriod.create({
    subscriptionId: sub._id,
    storeId: store._id,
    quotaTypeCode: "orders",
    graceStartDate: new Date(),
    graceEndDate: new Date(Date.now() + 86400000),
    status: "active",
  });
  created.grace.push(grace._id);

  const overview = await QuotaOps.getOverview({ storeId: store._id });
  assert.ok(overview.pagination);
  const row = overview.rows.find((r) => r.storeId === String(store._id));
  assert.ok(row, "le store doit apparaitre dans la vue");
  assert.equal(row.activeGracePeriods.length, 1);
  assert.ok(row.subscription, "l abonnement doit etre resolu");
});
