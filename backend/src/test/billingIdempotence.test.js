const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const WebhookEvent = require("../models/WebhookEvent");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Store = require("../models/Store");
const Plan = require("../models/Plan");
const Coupon = require("../models/Coupon");
const CouponUsage = require("../models/CouponUsage");
const AuditLog = require("../models/AuditLog");

const WebhookProcessing = require("../service/payment/WebhookProcessingService");
const InvoiceSM = require("../service/InvoiceStateMachine");
const CouponRedemption = require("../service/couponRedemptionService");
const Reconciliation = require("../service/BillingReconciliationService");

const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const created = { stores: [], plans: [], invoices: [], payments: [], coupons: [], events: [] };

const makeStore = async () => {
  const s = await Store.create({ name: uid("store"), status: "active" });
  created.stores.push(s._id);
  return s;
};

const makePlan = async () => {
  const p = await Plan.create({ name: uid("plan"), slug: uid("plan").toLowerCase() });
  created.plans.push(p._id);
  return p;
};

const makeInvoice = async (store, plan, { status = "draft", total = 100, dueDate = null } = {}) => {
  const inv = await Invoice.create({
    invoiceNumber: uid("INV").toUpperCase(),
    storeId: store._id,
    subscriptionId: new mongoose.Types.ObjectId(),
    planId: plan._id,
    items: [{ description: "Plan", quantity: 1, unitPrice: total, total }],
    baseAmount: total,
    subtotal: total,
    total,
    currency: "USD",
    status,
    dueDate,
  });
  created.invoices.push(inv._id);
  return inv;
};

const makeCoupon = async (store, overrides = {}) => {
  const c = await Coupon.create({
    storeId: store._id,
    code: uid("CPN").toUpperCase(),
    discountType: "percentage",
    amount: 10,
    status: "active",
    ...overrides,
  });
  created.coupons.push(c._id);
  return c;
};

test.before(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  await WebhookEvent.syncIndexes();
  await CouponUsage.syncIndexes();
});

test.after(async () => {
  await Promise.all([
    WebhookEvent.deleteMany({ eventId: { $regex: /^EVT-TEST/ } }),
    CouponUsage.deleteMany({ couponId: { $in: created.coupons } }),
    Coupon.deleteMany({ _id: { $in: created.coupons } }),
    Payment.deleteMany({ _id: { $in: created.payments } }),
    Invoice.deleteMany({ _id: { $in: created.invoices } }),
    AuditLog.deleteMany({ storeId: { $in: created.stores } }),
    Plan.deleteMany({ _id: { $in: created.plans } }),
    Store.deleteMany({ _id: { $in: created.stores } }),
  ]);
  await mongoose.connection.close();
});

/* ---------- Idempotence webhook (point critique) ---------- */

test("webhook: le meme evenement rejoue 10 fois ne produit qu un seul effet metier", async () => {
  const eventId = `EVT-TEST-${Date.now()}`;
  const payload = { id: eventId, type: "payment.succeeded", data: { amount: 4200 } };

  let effets = 0;
  const handler = async () => {
    effets += 1;
    return { applied: true };
  };

  const results = [];
  for (let i = 0; i < 10; i += 1) {
    results.push(await WebhookProcessing.processWebhook("stripe", payload, { handler }));
  }

  assert.equal(effets, 1, "le handler metier ne doit s executer qu une seule fois");
  assert.equal(results[0].status, "processed");

  const ignored = results.slice(1);
  assert.equal(ignored.length, 9);
  assert.ok(ignored.every((r) => r.status === "ignored"), "les 9 rejeux doivent etre ignores");
  assert.ok(ignored.every((r) => r.reason === "duplicate"));

  const rows = await WebhookEvent.countDocuments({ provider: "stripe", eventId });
  assert.equal(rows, 1, "un seul enregistrement WebhookEvent");
});

test("webhook: 10 rejeux simultanes, un seul effet metier", async () => {
  const eventId = `EVT-TEST-CONC-${Date.now()}`;
  const payload = { id: eventId, type: "payment.succeeded" };

  let effets = 0;
  const handler = async () => {
    effets += 1;
    return { ok: true };
  };

  const results = await Promise.all(
    Array.from({ length: 10 }, () => WebhookProcessing.processWebhook("stripe", payload, { handler }))
  );

  assert.equal(effets, 1, "meme sous concurrence, un seul effet");
  assert.equal(results.filter((r) => r.status === "processed").length, 1);
  assert.equal(results.filter((r) => r.status === "ignored").length, 9);
});

test("webhook: deux evenements distincts sont tous deux traites", async () => {
  const handler = async () => ({ ok: true });
  const a = await WebhookProcessing.processWebhook("stripe", { id: `EVT-TEST-A-${Date.now()}`, type: "x" }, { handler });
  const b = await WebhookProcessing.processWebhook("stripe", { id: `EVT-TEST-B-${Date.now()}`, type: "x" }, { handler });

  assert.equal(a.status, "processed");
  assert.equal(b.status, "processed");
});

test("webhook: sans eventId fourni, le hash du payload sert de cle d idempotence", async () => {
  const payload = { type: "payment.succeeded", montant: `EVT-TEST-HASH-${Date.now()}` };
  let effets = 0;
  const handler = async () => { effets += 1; };

  const first = await WebhookProcessing.processWebhook("konnect", payload, { handler });
  const second = await WebhookProcessing.processWebhook("konnect", payload, { handler });

  assert.equal(effets, 1);
  assert.equal(second.status, "ignored");

  const row = await WebhookEvent.findOne({ provider: "konnect", eventId: first.eventId });
  assert.equal(row.eventIdSource, "payload_hash");
  await WebhookEvent.deleteOne({ _id: row._id });
});

test("webhook: un handler en echec marque failed sans bloquer un rejeu ulterieur", async () => {
  const eventId = `EVT-TEST-FAIL-${Date.now()}`;
  const payload = { id: eventId, type: "payment.failed" };

  const result = await WebhookProcessing.processWebhook("stripe", payload, {
    handler: async () => {
      throw new Error("provider indisponible");
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.error, "provider indisponible");

  const row = await WebhookEvent.findOne({ provider: "stripe", eventId });
  assert.equal(row.status, "failed");
  assert.equal(row.error, "provider indisponible");
});

/* ---------- Cycle de vie des factures ---------- */

test("invoice: draft -> paid direct est refuse", () => {
  assert.equal(InvoiceSM.canTransition("draft", "paid"), false);
  assert.equal(InvoiceSM.canTransition("draft", "issued"), true);
  assert.equal(InvoiceSM.canTransition("issued", "open"), true);
  assert.equal(InvoiceSM.canTransition("open", "paid"), true);
});

test("invoice: statuts terminaux sans sortie", () => {
  assert.deepEqual(InvoiceSM.TERMINAL_STATUSES.sort(), ["cancelled", "refunded", "void"]);
  for (const terminal of InvoiceSM.TERMINAL_STATUSES) {
    for (const to of InvoiceSM.CANONICAL_STATUSES) {
      assert.equal(InvoiceSM.canTransition(terminal, to), false, `${terminal} -> ${to}`);
    }
  }
});

test("invoice: les alias legacy sont normalises", () => {
  assert.equal(InvoiceSM.normalizeStatus("sent"), "open");
  assert.equal(InvoiceSM.normalizeStatus("overdue"), "past_due");
  assert.equal(InvoiceSM.normalizeStatus("canceled"), "cancelled");
  assert.equal(InvoiceSM.canTransition("sent", "paid"), true);
});

test("invoice: transition invalide rejetee en 409, statut inchange", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const inv = await makeInvoice(store, plan, { status: "draft" });

  await assert.rejects(
    () => InvoiceSM.transition(inv._id, "paid", {}),
    (e) => e.code === "INVALID_INVOICE_TRANSITION" && e.status === 409
  );

  const fresh = await Invoice.findById(inv._id);
  assert.equal(fresh.status, "draft");
});

test("invoice: chemin complet draft -> issued -> open -> paid, audite en critical", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const inv = await makeInvoice(store, plan, { status: "draft" });

  await InvoiceSM.transition(inv._id, "issued", {});
  await InvoiceSM.transition(inv._id, "open", {});
  const paid = await InvoiceSM.transition(inv._id, "paid", { reason: "paiement recu" });

  assert.equal(paid.status, "paid");
  assert.ok(paid.paidAt);

  const log = await AuditLog.findOne({ entityId: inv._id, action: "invoice.status_changed" }).sort({ createdAt: -1 });
  assert.equal(log.severity, "critical");
});

test("invoice: snapshot de plan fige, insensible a un changement de plan ulterieur", async () => {
  const store = await makeStore();
  const plan = await makePlan();

  const snapshot = InvoiceSM.buildPlanSnapshot(
    plan,
    { _id: new mongoose.Types.ObjectId(), version: 3 },
    { _id: new mongoose.Types.ObjectId(), price: 250, currency: "USD", cycle: "monthly" }
  );

  const inv = await makeInvoice(store, plan, { status: "issued", total: 250 });
  inv.planSnapshot = snapshot;
  await inv.save();

  await Plan.updateOne({ _id: plan._id }, { $set: { name: "PLAN RENOMME APRES COUP" } });

  const reread = await Invoice.findById(inv._id);
  assert.equal(reread.planSnapshot.name, plan.name, "le nom fige ne suit pas le Plan");
  assert.equal(reread.planSnapshot.price, 250);
  assert.equal(reread.planSnapshot.version, 3);
  assert.equal(reread.total, 250, "le montant reste inchange");
});

test("invoice: numero de facture strictement unique", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const inv = await makeInvoice(store, plan);

  await assert.rejects(
    () =>
      Invoice.create({
        invoiceNumber: inv.invoiceNumber,
        storeId: store._id,
        subscriptionId: new mongoose.Types.ObjectId(),
        planId: plan._id,
        baseAmount: 10,
        subtotal: 10,
        total: 10,
      }),
    (e) => e.code === 11000
  );
});

/* ---------- Coupons ---------- */

test("coupon: double application sur la meme commande refusee", async () => {
  const store = await makeStore();
  const coupon = await makeCoupon(store);
  const orderId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();

  const first = await CouponRedemption.applyCoupon({
    code: coupon.code,
    storeId: store._id,
    customerId,
    orderId,
    amount: 200,
  });
  assert.equal(first.discountAmount, 20);
  assert.equal(first.finalAmount, 180);

  await assert.rejects(
    () =>
      CouponRedemption.applyCoupon({
        code: coupon.code,
        storeId: store._id,
        customerId,
        orderId,
        amount: 200,
      }),
    (e) => e.code === "COUPON_ALREADY_APPLIED"
  );

  const fresh = await Coupon.findById(coupon._id);
  assert.equal(fresh.usedCount, 1, "le refus ne doit pas consommer un usage supplementaire");
});

test("coupon: concurrence sur le dernier usage, exactement un gagnant", async () => {
  const store = await makeStore();
  const coupon = await makeCoupon(store, { usageLimit: 1 });

  const results = await Promise.allSettled([
    CouponRedemption.applyCoupon({
      code: coupon.code,
      storeId: store._id,
      customerId: new mongoose.Types.ObjectId(),
      orderId: new mongoose.Types.ObjectId(),
      amount: 100,
    }),
    CouponRedemption.applyCoupon({
      code: coupon.code,
      storeId: store._id,
      customerId: new mongoose.Types.ObjectId(),
      orderId: new mongoose.Types.ObjectId(),
      amount: 100,
    }),
  ]);

  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected")[0].reason.code, "COUPON_USAGE_LIMIT_REACHED");

  const fresh = await Coupon.findById(coupon._id);
  assert.equal(fresh.usedCount, 1, "usedCount ne depasse jamais usageLimit");
});

test("coupon: un coupon d un autre store est refuse", async () => {
  const storeA = await makeStore();
  const storeB = await makeStore();
  const coupon = await makeCoupon(storeA);

  await assert.rejects(
    () =>
      CouponRedemption.applyCoupon({
        code: coupon.code,
        storeId: storeB._id,
        customerId: new mongoose.Types.ObjectId(),
        orderId: new mongoose.Types.ObjectId(),
        amount: 100,
      }),
    (e) => e.code === "COUPON_NOT_FOUND" || e.code === "COUPON_STORE_MISMATCH"
  );
});

test("coupon: limite par client respectee", async () => {
  const store = await makeStore();
  const coupon = await makeCoupon(store, { usageLimitPerCustomer: 1 });
  const customerId = new mongoose.Types.ObjectId();

  await CouponRedemption.applyCoupon({
    code: coupon.code,
    storeId: store._id,
    customerId,
    orderId: new mongoose.Types.ObjectId(),
    amount: 100,
  });

  await assert.rejects(
    () =>
      CouponRedemption.applyCoupon({
        code: coupon.code,
        storeId: store._id,
        customerId,
        orderId: new mongoose.Types.ObjectId(),
        amount: 100,
      }),
    (e) => e.code === "COUPON_LIMIT_PER_CUSTOMER_REACHED"
  );
});

test("coupon: coupon expire refuse", async () => {
  const store = await makeStore();
  const coupon = await makeCoupon(store, { endDate: new Date(Date.now() - 86400000) });

  await assert.rejects(
    () =>
      CouponRedemption.applyCoupon({
        code: coupon.code,
        storeId: store._id,
        customerId: new mongoose.Types.ObjectId(),
        orderId: new mongoose.Types.ObjectId(),
        amount: 100,
      }),
    (e) => e.code === "COUPON_EXPIRED"
  );
});

/* ---------- Reconciliation ---------- */

test("reconciliation: detecte une facture payee sans paiement reussi", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const inv = await makeInvoice(store, plan, { status: "paid" });

  const report = await Reconciliation.detectAnomalies({ storeId: store._id });
  const anomaly = report.anomalies.find(
    (a) => String(a.invoiceId) === String(inv._id) && a.type === "INVOICE_PAID_PAYMENT_MISMATCH"
  );

  assert.ok(anomaly, "la facture payee sans paiement doit remonter");
  assert.equal(anomaly.paymentStatus, null);
});

test("reconciliation: detecte une facture echue sans paiement", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const inv = await makeInvoice(store, plan, {
    status: "open",
    dueDate: new Date(Date.now() - 7 * 86400000),
  });

  const report = await Reconciliation.detectAnomalies({ storeId: store._id });
  const anomaly = report.anomalies.find(
    (a) => String(a.invoiceId) === String(inv._id) && a.type === "INVOICE_OVERDUE_NO_PAYMENT"
  );

  assert.ok(anomaly, "la facture echue doit remonter");
  assert.equal(report.byType.INVOICE_OVERDUE_NO_PAYMENT >= 1, true);
});

test("reconciliation: une facture payee avec paiement reussi n est pas une anomalie", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const inv = await makeInvoice(store, plan, { status: "paid" });

  const payment = await Payment.create({
    storeId: store._id,
    invoiceId: inv._id,
    orderId: new mongoose.Types.ObjectId(),
    method: "card",
    amount: 100,
    currency: "USD",
    status: "paid",
  });
  created.payments.push(payment._id);

  const report = await Reconciliation.detectAnomalies({ storeId: store._id });
  const anomaly = report.anomalies.find(
    (a) => String(a.invoiceId) === String(inv._id) && a.type === "INVOICE_PAID_PAYMENT_MISMATCH"
  );

  assert.equal(anomaly, undefined, "aucune anomalie attendue");
});
