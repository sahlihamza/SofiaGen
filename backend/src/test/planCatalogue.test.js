const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const Plan = require("../models/Plan");
const PlanVersion = require("../models/PlanVersion");
const PlanPrice = require("../models/PlanPrice");
const Store = require("../models/Store");
const Subscription = require("../models/Subscription");
const AuditLog = require("../models/AuditLog");

const Catalog = require("../service/PlanCatalogService");
const Entitlement = require("../service/EntitlementService");
const { migrate, rollback, BACKUP_COLLECTION } = require("../script/migratePlanCatalogue");

const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const created = { plans: [], versions: [], prices: [], stores: [], subs: [] };

const makePlan = async (overrides = {}) => {
  const plan = await Catalog.createPlan(
    { name: uid("plan"), slug: uid("plan").toLowerCase(), category: "business", ...overrides },
    null
  );
  created.plans.push(plan._id);
  return plan;
};

const makeStore = async () => {
  const s = await Store.create({ name: uid("store"), status: "active" });
  created.stores.push(s._id);
  return s;
};

const makeSub = async (store, plan, planVersionId, status = "active") => {
  const s = await Subscription.create({
    storeId: store._id,
    planId: plan._id,
    planVersionId: planVersionId || null,
    status,
    billingCycle: "monthly",
    currency: "USD",
  });
  created.subs.push(s._id);
  return s;
};

test.before(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
});

test.after(async () => {
  await Promise.all([
    Subscription.deleteMany({ _id: { $in: created.subs } }),
    Store.deleteMany({ _id: { $in: created.stores } }),
    PlanPrice.deleteMany({ planId: { $in: created.plans } }),
    PlanVersion.deleteMany({ planId: { $in: created.plans } }),
    AuditLog.deleteMany({ entityId: { $in: created.plans } }),
    Plan.deleteMany({ _id: { $in: created.plans } }),
  ]);
  await mongoose.connection.close();
});

test("plan: creation en draft par defaut, code unique", async () => {
  const code = uid("CODE").toUpperCase();
  const plan = await makePlan({ code });
  assert.equal(plan.status, "draft");
  assert.equal(plan.code, code);

  await assert.rejects(
    () => makePlan({ code }),
    (e) => e.code === "PLAN_DUPLICATE"
  );
});

test("plan: slug duplique refuse", async () => {
  const plan = await makePlan();
  await assert.rejects(
    () => makePlan({ slug: plan.slug }),
    (e) => e.code === "PLAN_DUPLICATE"
  );
});

test("plan: update refuse pricing/features/limits (pas de divergence possible)", async () => {
  const plan = await makePlan();

  for (const field of ["pricing", "features", "limits", "pricingHistory"]) {
    await assert.rejects(
      () => Catalog.updatePlan(plan._id, { [field]: { monthly: 42 } }),
      (e) => e.code === "PLAN_FIELD_NOT_EDITABLE",
      `${field} doit etre refuse`
    );
  }

  const renamed = await Catalog.updatePlan(plan._id, { name: uid("renomme"), category: "starter" });
  assert.equal(renamed.category, "starter");

  const fresh = await Plan.findById(plan._id);
  assert.equal(fresh.pricing?.monthly, undefined, "aucun prix ne doit avoir ete ecrit sur le Plan");
});

test("plan: suppression refusee si une souscription active reference le plan (409 PLAN_IN_USE)", async () => {
  const plan = await makePlan();
  const store = await makeStore();
  await makeSub(store, plan, null, "active");

  await assert.rejects(
    () => Catalog.deletePlan(plan._id),
    (e) => e.code === "PLAN_IN_USE" && e.status === 409
  );

  const stillThere = await Plan.findById(plan._id);
  assert.equal(stillThere.deletedAt, null, "le plan ne doit pas avoir ete supprime");
});

test("plan: suppression autorisee sans souscription active, en soft-delete", async () => {
  const plan = await makePlan();
  const result = await Catalog.deletePlan(plan._id);
  assert.ok(result.deletedAt);

  const fresh = await Plan.findById(plan._id);
  assert.ok(fresh, "soft-delete: le document doit rester en base");
  assert.ok(fresh.deletedAt);
  assert.equal(fresh.status, "archived");
});

test("plan: souscription annulee ne bloque pas la suppression", async () => {
  const plan = await makePlan();
  const store = await makeStore();
  await makeSub(store, plan, null, "canceled");

  const result = await Catalog.deletePlan(plan._id);
  assert.ok(result.deletedAt);
});

test("version: creation en draft puis publication rend immuable", async () => {
  const plan = await makePlan();
  const version = await Catalog.createVersion(plan._id, {
    featureRefs: [{ code: "builder", enabled: true }],
    quotaRefs: [{ quotaTypeCode: "products", limitValue: 100, isUnlimited: false }],
  });
  created.versions.push(version._id);

  assert.equal(version.status, "draft");
  assert.equal(version.isImmutable, false);

  const { version: published, impact } = await Catalog.publishVersion(plan._id, version._id);
  assert.equal(published.status, "published");
  assert.equal(published.isImmutable, true);
  assert.ok(published.publishedAt);
  assert.equal(typeof impact.activeSubscriptions, "number");

  const fresh = await Plan.findById(plan._id);
  assert.equal(String(fresh.currentVersionId), String(version._id));
});

test("version: isImmutable empeche toute mutation apres publication (save doit throw)", async () => {
  const plan = await makePlan();
  const version = await Catalog.createVersion(plan._id, {
    featureRefs: [{ code: "builder", enabled: true }],
  });
  await Catalog.publishVersion(plan._id, version._id);

  const reloaded = await PlanVersion.findById(version._id);
  reloaded.snapshot.featureRefs = [{ code: "builder", enabled: false }];

  await assert.rejects(
    () => reloaded.save(),
    (e) => e.code === "PLAN_VERSION_IMMUTABLE"
  );

  const untouched = await PlanVersion.findById(version._id);
  assert.equal(untouched.snapshot.featureRefs[0].enabled, true, "la version publiee ne doit pas avoir change");
});

test("version: isImmutable bloque aussi une mutation par requete (findOneAndUpdate)", async () => {
  const plan = await makePlan();
  const version = await Catalog.createVersion(plan._id, {
    featureRefs: [{ code: "analytics", enabled: true }],
  });
  await Catalog.publishVersion(plan._id, version._id);

  await assert.rejects(
    () =>
      PlanVersion.findOneAndUpdate(
        { _id: version._id },
        { $set: { "snapshot.featureRefs": [] } }
      ),
    (e) => e.code === "PLAN_VERSION_IMMUTABLE"
  );
});

test("version: une version publiee ne peut plus etre editee via le service", async () => {
  const plan = await makePlan();
  const version = await Catalog.createVersion(plan._id, {});
  await Catalog.publishVersion(plan._id, version._id);

  await assert.rejects(
    () => Catalog.updateVersion(plan._id, version._id, { featureRefs: [] }),
    (e) => e.code === "PLAN_VERSION_NOT_DRAFT"
  );
});

test("version: publier une nouvelle version n'affecte aucune souscription existante", async () => {
  const plan = await makePlan();
  const v1 = await Catalog.createVersion(plan._id, {
    featureRefs: [{ code: "builder", enabled: true }],
  });
  await Catalog.publishVersion(plan._id, v1._id);

  const store = await makeStore();
  const sub = await makeSub(store, plan, v1._id, "active");

  assert.equal(await Entitlement.hasFeature(store._id, "builder"), true);

  const v2 = await Catalog.createVersion(plan._id, {
    featureRefs: [{ code: "builder", enabled: false }],
  });
  await Catalog.publishVersion(plan._id, v2._id);

  const reloadedSub = await Subscription.findById(sub._id);
  assert.equal(String(reloadedSub.planVersionId), String(v1._id), "la souscription reste sur v1");
  assert.equal(
    await Entitlement.hasFeature(store._id, "builder"),
    true,
    "l entitlement doit rester celui de v1"
  );

  const archivedV1 = await PlanVersion.findById(v1._id);
  assert.equal(archivedV1.snapshot.featureRefs[0].enabled, true);
});

test("version: impact indique le nombre de stores avant publication", async () => {
  const plan = await makePlan();
  const store = await makeStore();
  await makeSub(store, plan, null, "active");

  const impact = await Catalog.getPublishImpact(plan._id);
  assert.equal(impact.activeSubscriptions, 1);
  assert.ok(impact.note.includes("n'affecte aucune souscription"));
});

test("entitlement: hasFeature false sans souscription, requireFeature leve 403", async () => {
  const store = await makeStore();
  assert.equal(await Entitlement.hasFeature(store._id, "builder"), false);

  await assert.rejects(
    () => Entitlement.requireFeature(store._id, "builder"),
    (e) => e.code === "FEATURE_NOT_INCLUDED" && e.status === 403
  );
});

test("entitlement: feature desactivee dans la version refuse l acces", async () => {
  const plan = await makePlan();
  const version = await Catalog.createVersion(plan._id, {
    featureRefs: [
      { code: "builder", enabled: true },
      { code: "analytics", enabled: false },
    ],
  });
  await Catalog.publishVersion(plan._id, version._id);

  const store = await makeStore();
  await makeSub(store, plan, version._id, "active");

  assert.equal(await Entitlement.hasFeature(store._id, "builder"), true);
  assert.equal(await Entitlement.hasFeature(store._id, "analytics"), false);

  await assert.rejects(
    () => Entitlement.requireFeature(store._id, "analytics"),
    (e) => e.code === "FEATURE_NOT_INCLUDED"
  );
});

test("entitlement: retombe sur currentVersionId si la souscription n a pas de planVersionId", async () => {
  const plan = await makePlan();
  const version = await Catalog.createVersion(plan._id, {
    featureRefs: [{ code: "exports", enabled: true }],
  });
  await Catalog.publishVersion(plan._id, version._id);

  const store = await makeStore();
  await makeSub(store, plan, null, "active");

  assert.equal(await Entitlement.hasFeature(store._id, "exports"), true);
});

test("entitlement: getQuota lit la meme definition que la version publiee", async () => {
  const plan = await makePlan();
  const version = await Catalog.createVersion(plan._id, {
    quotaRefs: [
      { quotaTypeCode: "products", limitValue: 250, isUnlimited: false, softWarningAt: 80 },
      { quotaTypeCode: "orders", limitValue: null, isUnlimited: true },
    ],
  });
  await Catalog.publishVersion(plan._id, version._id);

  const store = await makeStore();
  await makeSub(store, plan, version._id, "active");

  const products = await Entitlement.getQuota(store._id, "products");
  assert.equal(products.limitValue, 250);
  assert.equal(products.isUnlimited, false);
  assert.equal(products.warningThreshold, 80);
  assert.equal(products.source, "planVersion.quotaRefs");

  const orders = await Entitlement.getQuota(store._id, "orders");
  assert.equal(orders.isUnlimited, true);
  assert.equal(orders.limitValue, null);
});

test("entitlement: middleware renvoie 403 FEATURE_NOT_INCLUDED", async () => {
  const store = await makeStore();
  const mw = Entitlement.requireFeatureMiddleware("builder");

  let statusCode = null;
  let body = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(b) { body = b; return this; },
  };

  await mw({ storeId: store._id }, res, () => { throw new Error("next ne doit pas etre appele"); });

  assert.equal(statusCode, 403);
  assert.equal(body.code, "FEATURE_NOT_INCLUDED");
});

test("migration: dry-run n ecrit rien, apply puis rollback restaure l etat", async () => {
  const plan = await makePlan();

  const before = await PlanVersion.countDocuments({ planId: plan._id });
  const dry = await migrate({ dryRun: true });
  const afterDry = await PlanVersion.countDocuments({ planId: plan._id });
  assert.equal(afterDry, before, "le dry-run ne doit rien ecrire");
  assert.ok(dry.plansProcessed > 0);

  const applied = await migrate({ dryRun: false });
  assert.ok(applied.batchId);

  const afterApply = await Plan.findById(plan._id);
  assert.ok(afterApply.currentVersionId, "le plan doit pointer sur une version apres migration");

  const report = await rollback(applied.batchId);
  assert.ok(report.versionsRemoved >= 0);

  const backups = await mongoose.connection.db
    .collection(BACKUP_COLLECTION)
    .countDocuments({ batchId: applied.batchId });
  assert.equal(backups, 0, "les sauvegardes du batch doivent etre purgees apres rollback");
});
