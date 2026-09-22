const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const Store = require("../models/Store");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const Invoice = require("../models/Invoice");
const AuditLog = require("../models/AuditLog");

const AuditService = require("../service/AuditService");
const { sanitizeAuditPayload, isSensitiveKey } = require("../utils/sanitizeAuditPayload");
const BillingReports = require("../service/BillingReportsService");
const { runBillingReconciliation } = require("../jobs/billingReconciliationJob");
const InvoiceSM = require("../service/InvoiceStateMachine");

const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const created = { stores: [], plans: [], subs: [], invoices: [] };

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

const makeSub = async (store, plan, extra = {}) => {
  const s = await Subscription.create({
    storeId: store._id,
    planId: plan._id,
    status: "active",
    billingCycle: "monthly",
    currency: "USD",
    unitPrice: 100,
    finalPrice: 100,
    currentPeriodStart: new Date(Date.now() - 86400000),
    currentPeriodEnd: new Date(Date.now() + 86400000 * 10),
    ...extra,
  });
  created.subs.push(s._id);
  return s;
};

const makeInvoice = async (store, plan, extra = {}) => {
  const inv = await Invoice.create({
    invoiceNumber: uid("INV").toUpperCase(),
    storeId: store._id,
    subscriptionId: new mongoose.Types.ObjectId(),
    planId: plan._id,
    baseAmount: 100,
    subtotal: 100,
    total: 100,
    currency: "USD",
    status: "draft",
    ...extra,
  });
  created.invoices.push(inv._id);
  return inv;
};

test.before(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  await SubscriptionEvent.syncIndexes();
});

test.after(async () => {
  await Promise.all([
    SubscriptionEvent.deleteMany({ storeId: { $in: created.stores } }),
    Invoice.deleteMany({ _id: { $in: created.invoices } }),
    Subscription.deleteMany({ storeId: { $in: created.stores } }),
    AuditLog.deleteMany({ storeId: { $in: created.stores } }),
    Plan.deleteMany({ _id: { $in: created.plans } }),
    Store.deleteMany({ _id: { $in: created.stores } }),
  ]);
  await mongoose.connection.close();
});

/* ---------- SubscriptionEvent : tracabilite ---------- */

test("event: idempotencyKey/correlationId/source/planId presents au schema", () => {
  const paths = Object.keys(SubscriptionEvent.schema.paths);
  for (const field of ["idempotencyKey", "correlationId", "source", "planId"]) {
    assert.ok(paths.includes(field), `${field} doit exister au schema`);
  }
  assert.deepEqual(SubscriptionEvent.schema.path("source").enumValues, ["manual", "job", "webhook", "api"]);
});

test("event: planId est bien persiste et non silencieusement supprime", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan);

  const evt = await SubscriptionEvent.create({
    subscriptionId: sub._id,
    storeId: store._id,
    planId: plan._id,
    type: "status_changed",
    source: "api",
  });

  const reread = await SubscriptionEvent.findById(evt._id);
  assert.equal(String(reread.planId), String(plan._id), "planId ne doit pas etre perdu");
});

test("event: idempotencyKey unique empeche le doublon", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan);
  const key = uid("idem");

  await SubscriptionEvent.create({
    subscriptionId: sub._id,
    storeId: store._id,
    type: "plan_changed",
    idempotencyKey: key,
  });

  await assert.rejects(
    () =>
      SubscriptionEvent.create({
        subscriptionId: sub._id,
        storeId: store._id,
        type: "plan_changed",
        idempotencyKey: key,
      }),
    (e) => e.code === 11000
  );
});

test("event: l index est sparse, plusieurs events sans cle coexistent", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan);

  await SubscriptionEvent.create({ subscriptionId: sub._id, storeId: store._id, type: "a" });
  await SubscriptionEvent.create({ subscriptionId: sub._id, storeId: store._id, type: "b" });

  const count = await SubscriptionEvent.countDocuments({ subscriptionId: sub._id });
  assert.ok(count >= 2, "les events sans idempotencyKey ne doivent pas entrer en collision");
});

test("event: correlationId relie toute une sequence", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan);
  const correlationId = uid("corr");

  for (const type of ["status_changed", "plan_changed", "invoice_issued"]) {
    await SubscriptionEvent.create({ subscriptionId: sub._id, storeId: store._id, type, correlationId });
  }

  const sequence = await SubscriptionEvent.find({ correlationId });
  assert.equal(sequence.length, 3, "une seule requete doit retrouver le flux complet");
});

/* ---------- Sanitisation des audits ---------- */

test("audit: sanitizeAuditPayload redige les secrets, garde le reste", () => {
  const out = sanitizeAuditPayload({
    apiKey: "sk_live_secret",
    password: "hunter2",
    nested: { webhookSecret: "whsec_1", cardNumber: "4242424242424242" },
    amount: 42,
    name: "Ana",
  });

  assert.equal(out.apiKey, "[REDACTED]");
  assert.equal(out.password, "[REDACTED]");
  assert.equal(out.nested.webhookSecret, "[REDACTED]");
  assert.equal(out.nested.cardNumber, "[REDACTED]");
  assert.equal(out.amount, 42, "les donnees non sensibles restent lisibles");
  assert.equal(out.name, "Ana");
});

test("audit: les cles historiques restent couvertes apres unification", () => {
  for (const key of ["ssn", "creditCard", "sessionId", "twoFactorSecret", "refreshToken", "private_key"]) {
    assert.ok(isSensitiveKey(key), `${key} doit rester masque`);
  }
  for (const key of ["amount", "status", "planId"]) {
    assert.ok(!isSensitiveKey(key), `${key} ne doit pas etre masque`);
  }
});

test("audit: un apiKey ecrit via AuditService ressort [REDACTED] en base", async () => {
  const store = await makeStore();

  await AuditService.logAction({
    actorType: "system",
    module: "Platform Billing",
    action: "test.secret_leak",
    summary: "test de redaction",
    entityType: "billing",
    storeId: store._id,
    status: "success",
    severity: "low",
    metadata: { apiKey: "sk_live_NEVER_STORE_ME", password: "hunter2", amount: 10 },
  });

  const log = await AuditLog.findOne({ storeId: store._id, action: "test.secret_leak" });
  assert.ok(log, "l audit doit exister");
  assert.notEqual(log.metadata.apiKey, "sk_live_NEVER_STORE_ME", "le secret ne doit jamais atterrir en base");
  assert.equal(log.metadata.apiKey, "[REDACTED]");
  assert.equal(log.metadata.password, "[REDACTED]");
  assert.equal(log.metadata.amount, 10);
});

test("audit: aucun secret en clair dans la collection apres ecriture", async () => {
  const store = await makeStore();
  const secret = `sk_live_${Date.now()}`;

  await AuditService.logAction({
    actorType: "system",
    module: "Platform Billing",
    action: "test.raw_scan",
    summary: "scan brut",
    storeId: store._id,
    status: "success",
    severity: "low",
    newValue: { secretKey: secret },
  });

  const raw = await mongoose.connection.db
    .collection("audit_logs")
    .findOne({ storeId: store._id, action: "test.raw_scan" });

  assert.ok(!JSON.stringify(raw).includes(secret), "le secret ne doit apparaitre nulle part dans le document");
});

/* ---------- Job de reconciliation ---------- */

test("job: transitionne les factures echues et reste idempotent au 2e passage", async () => {
  const store = await makeStore();
  const plan = await makePlan();

  const inv = await makeInvoice(store, plan, {
    status: "open",
    dueDate: new Date(Date.now() - 5 * 86400000),
  });

  const first = await runBillingReconciliation();
  assert.ok(first.invoicesFlaggedPastDue >= 1, "le 1er passage doit corriger la facture");

  const afterFirst = await Invoice.findById(inv._id);
  assert.equal(InvoiceSM.normalizeStatus(afterFirst.status), "past_due");

  const second = await runBillingReconciliation();
  const stillOverdue = await Invoice.countDocuments({
    _id: inv._id,
    status: { $in: InvoiceSM.expandForQuery(["open"]) },
  });

  assert.equal(stillOverdue, 0, "la facture ne doit plus matcher le filtre");
  assert.notEqual(first.correlationId, second.correlationId, "chaque execution a son propre correlationId");
});

test("job: expire les essais depasses puis ne les revoit plus", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  const sub = await makeSub(store, plan, {
    status: "trialing",
    trialEndsAt: new Date(Date.now() - 86400000),
  });

  const first = await runBillingReconciliation();
  assert.ok(first.trialsExpired >= 1);

  const fresh = await Subscription.findById(sub._id);
  assert.equal(fresh.status, "expired");

  const second = await runBillingReconciliation();
  const stillTrialing = await Subscription.countDocuments({ _id: sub._id, status: "trialing" });
  assert.equal(stillTrialing, 0, "l abonnement ne doit plus matcher au 2e passage");
  assert.equal(second.trialsScanned, 0, "aucun essai a corriger au 2e passage");
});

test("job: ecrit un audit de run avec le correlationId", async () => {
  const summary = await runBillingReconciliation();
  const log = await AuditLog.findOne({ action: "billing_reconciliation_run" }).sort({ createdAt: -1 });

  assert.ok(log, "un audit de run doit exister");
  assert.equal(log.metadata.correlationId, summary.correlationId);
});

/* ---------- Rapports unifies ---------- */

test("reports: type manquant ou inconnu refuse avec la liste des types", async () => {
  await assert.rejects(
    () => BillingReports.getReport(undefined, {}),
    (e) => e.code === "REPORT_TYPE_REQUIRED"
  );
  await assert.rejects(
    () => BillingReports.getReport("n_importe_quoi", {}),
    (e) => e.code === "UNKNOWN_REPORT_TYPE"
  );
});

test("reports: les 11 types annonces sont tous servis par la meme API", async () => {
  assert.equal(BillingReports.REPORT_TYPES.length, 11);
  for (const type of BillingReports.REPORT_TYPES) {
    const report = await BillingReports.getReport(type, {});
    assert.equal(report.type, type);
    assert.ok(report.data !== undefined, `${type} doit renvoyer des donnees`);
    assert.ok(report.generatedAt instanceof Date);
  }
});

test("reports: MRR normalise le cycle annuel en mensuel", async () => {
  const store = await makeStore();
  const plan = await makePlan();
  await makeSub(store, plan, { billingCycle: "yearly", unitPrice: 1200, finalPrice: 1200 });

  const report = await BillingReports.getReport("mrr", { storeId: store._id });
  assert.equal(report.data.mrr, 100, "1200/an doit compter 100/mois");

  const arr = await BillingReports.getReport("arr", { storeId: store._id });
  assert.equal(arr.data.arr, 1200);
});

test("reports: le scope storeId isole les donnees d un seul store", async () => {
  const storeA = await makeStore();
  const storeB = await makeStore();
  const plan = await makePlan();

  await makeSub(storeA, plan, { unitPrice: 50, finalPrice: 50 });
  await makeSub(storeB, plan, { unitPrice: 300, finalPrice: 300 });

  const a = await BillingReports.getReport("mrr", { storeId: storeA._id });
  const b = await BillingReports.getReport("mrr", { storeId: storeB._id });

  assert.equal(a.data.mrr, 50);
  assert.equal(b.data.mrr, 300);
  assert.equal(a.scope.storeId, storeA._id);
});

test("reports: storeId invalide refuse", async () => {
  await assert.rejects(
    () => BillingReports.getReport("mrr", { storeId: "pas-un-objectid" }),
    (e) => e.code === "BAD_REQUEST"
  );
});

/* ---------- RBAC / feature flags ---------- */

test("rbac: le middleware feature flag ne peut jamais autoriser seul", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "middleware", "featureFlagGuard.js"),
    "utf8"
  );
  assert.ok(!/next\(\)/.test(source.split("if (!enabled)")[0]), "le guard ne doit pas appeler next avant sa verification");
  assert.ok(source.includes("FEATURE_FLAG_DISABLED"), "le refus doit etre explicite");
  assert.ok(source.includes("403"), "un flag desactive renvoie 403");
});

test("rbac: les routes billing placent la permission avant le feature flag", () => {
  const routeFiles = ["billingReconciliationRoutes.js", "planRoutes.js", "subscriptionRoutes.js"];
  for (const file of routeFiles) {
    const full = path.join(__dirname, "..", "routes", file);
    if (!fs.existsSync(full)) continue;
    const source = fs.readFileSync(full, "utf8");

    const lines = source.split("\n").filter((l) => /router\.(get|post|put|patch|delete)/.test(l));
    for (const line of lines) {
      if (!line.includes("checkFeatureFlag")) continue;
      const permIdx = line.indexOf("requirePermission");
      const flagIdx = line.indexOf("checkFeatureFlag");
      assert.ok(permIdx >= 0, `${file}: un feature flag sans permission -> ${line.trim()}`);
      assert.ok(permIdx < flagIdx, `${file}: la permission doit preceder le flag -> ${line.trim()}`);
    }
  }
});

test("rbac: aucun isAdmin residuel sur les routes billing", () => {
  const billingRoutes = [
    "planRoutes.js",
    "subscriptionRoutes.js",
    "invoiceRoutes.js",
    "platformCouponRoutes.js",
    "billingReconciliationRoutes.js",
    "overageRoutes.js",
  ];

  for (const file of billingRoutes) {
    const full = path.join(__dirname, "..", "routes", file);
    if (!fs.existsSync(full)) continue;
    const source = fs.readFileSync(full, "utf8");
    const offending = source
      .split("\n")
      .filter((l) => /\bisAdmin\b/.test(l) && !l.trim().startsWith("//"));
    assert.equal(offending.length, 0, `${file} utilise encore isAdmin: ${offending.join(" | ")}`);
  }
});

test("rbac: les routes billing exigent toutes une permission explicite", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "routes", "billingReconciliationRoutes.js"),
    "utf8"
  );
  const routeLines = source.split("\n").filter((l) => /router\.(get|post|put|patch|delete)\(/.test(l));
  assert.ok(routeLines.length >= 2, "au moins 2 routes attendues");

  const blocks = source.split(/router\.(?=get|post|put|patch|delete)/).slice(1);
  for (const block of blocks) {
    assert.ok(
      block.includes("requirePermission"),
      `route sans requirePermission: ${block.split("\n")[0]}`
    );
  }
});
