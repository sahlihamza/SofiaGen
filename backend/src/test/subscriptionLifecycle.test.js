const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const Subscription = require("../models/Subscription");
const Store = require("../models/Store");
const Plan = require("../models/Plan");
const PlanVersion = require("../models/PlanVersion");
const PlanPrice = require("../models/PlanPrice");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const AuditLog = require("../models/AuditLog");

const StateMachine = require("../service/SubscriptionStateMachine");
const Provisioning = require("../service/SubscriptionProvisioningService");
const TrialEngine = require("../service/TrialEngineService");
const Catalog = require("../service/PlanCatalogService");
const { STATUS, CANONICAL_STATUSES, normalizeStatus } = require("../utils/subscriptionStatus");
const { suspendExpiredGracePeriods } = require("../jobs/subscriptionExpiryJob");

const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const created = { stores: [], plans: [], subs: [] };

const makeStore = async () => {
  const s = await Store.create({ name: uid("store"), status: "active" });
  created.stores.push(s._id);
  return s;
};

const makePlanWithVersionAndPrice = async ({ price = 100, currency = "USD", cycle = "monthly" } = {}) => {
  const plan = await Catalog.createPlan({ name: uid("plan"), slug: uid("plan").toLowerCase() });
  created.plans.push(plan._id);

  const version = await Catalog.createVersion(plan._id, {
    featureRefs: [{ code: "builder", enabled: true }],
    quotaRefs: [{ quotaTypeCode: "products", limitValue: 100, isUnlimited: false }],
  });
  await Catalog.publishVersion(plan._id, version._id);

  const planPrice = await PlanPrice.create({
    planId: plan._id,
    currency,
    cycle,
    price,
    status: "active",
    effectiveFrom: new Date(Date.now() - 86400000),
  });

  const fresh = await Plan.findById(plan._id);
  return { plan: fresh, version, planPrice };
};

const makeSubRaw = async (store, plan, status) => {
  const s = await Subscription.create({
    storeId: store._id,
    planId: plan._id,
    status,
    billingCycle: "monthly",
    currency: "USD",
  });
  created.subs.push(s._id);
  return s;
};

test.before(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  await Subscription.syncIndexes();
});

test.after(async () => {
  await Promise.all([
    SubscriptionEvent.deleteMany({ storeId: { $in: created.stores } }),
    Subscription.deleteMany({ _id: { $in: created.subs } }),
    Subscription.deleteMany({ storeId: { $in: created.stores } }),
    AuditLog.deleteMany({ storeId: { $in: created.stores } }),
    PlanPrice.deleteMany({ planId: { $in: created.plans } }),
    PlanVersion.deleteMany({ planId: { $in: created.plans } }),
    Plan.deleteMany({ _id: { $in: created.plans } }),
    Store.deleteMany({ _id: { $in: created.stores } }),
  ]);
  await mongoose.connection.close();
});

const EXPECTED = {
  pending: ["trialing", "active", "cancelled", "expired"],
  trialing: ["active", "past_due", "expired", "cancelled", "suspended"],
  active: ["past_due", "cancelled", "suspended"],
  past_due: ["active", "grace_period", "suspended", "cancelled"],
  grace_period: ["active", "suspended", "cancelled"],
  suspended: ["active", "cancelled", "expired"],
  cancelled: [],
  expired: ["active"],
};

test("matrice: chaque paire des 8 statuts est assertee explicitement", () => {
  let pairs = 0;
  for (const from of CANONICAL_STATUSES) {
    for (const to of CANONICAL_STATUSES) {
      pairs += 1;
      const expected = EXPECTED[from].includes(to);
      assert.equal(
        StateMachine.canTransition(from, to),
        expected,
        `${from} -> ${to} devrait etre ${expected ? "autorise" : "interdit"}`
      );
    }
  }
  assert.equal(pairs, 64, "8 statuts x 8 = 64 paires couvertes");
});

test("matrice: cancelled est terminal, aucune sortie", () => {
  for (const to of CANONICAL_STATUSES) {
    assert.equal(StateMachine.canTransition("cancelled", to), false, `cancelled -> ${to}`);
  }
});

test("matrice: past_due -> active autorise, cancelled -> active interdit", () => {
  assert.equal(StateMachine.canTransition("past_due", "active"), true);
  assert.equal(StateMachine.canTransition("cancelled", "active"), false);
});

test("matrice: les alias legacy sont normalises", () => {
  assert.equal(normalizeStatus("trial"), "trialing");
  assert.equal(normalizeStatus("canceled"), "cancelled");
  assert.equal(StateMachine.canTransition("trial", "active"), true);
  assert.equal(StateMachine.canTransition("active", "canceled"), true);
});

test("transition: refus renvoie INVALID_TRANSITION en 409", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();
  const sub = await makeSubRaw(store, plan, STATUS.CANCELLED);

  await assert.rejects(
    () => StateMachine.transition(sub._id, STATUS.ACTIVE, {}),
    (e) => e.code === "INVALID_TRANSITION" && e.status === 409
  );

  const fresh = await Subscription.findById(sub._id);
  assert.equal(fresh.status, STATUS.CANCELLED, "le statut ne doit pas avoir bouge");
});

test("transition: statut cible inconnu refuse", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();
  const sub = await makeSubRaw(store, plan, STATUS.ACTIVE);

  await assert.rejects(
    () => StateMachine.transition(sub._id, "n_importe_quoi", {}),
    (e) => e.code === "UNKNOWN_STATUS"
  );
});

test("transition: succes ecrit un SubscriptionEvent et un audit", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();
  const sub = await makeSubRaw(store, plan, STATUS.ACTIVE);

  await StateMachine.transition(sub._id, STATUS.PAST_DUE, { reason: "echec de paiement" });

  const fresh = await Subscription.findById(sub._id);
  assert.equal(fresh.status, STATUS.PAST_DUE);

  const event = await SubscriptionEvent.findOne({ subscriptionId: sub._id, type: "status_changed" });
  assert.ok(event, "un SubscriptionEvent doit exister");
  assert.equal(event.payload.from, STATUS.ACTIVE);
  assert.equal(event.payload.to, STATUS.PAST_DUE);

  const log = await AuditLog.findOne({ entityId: sub._id, action: "subscription.status_changed" });
  assert.ok(log, "un audit doit exister");
  assert.equal(log.metadata.reason, "echec de paiement");
  assert.equal(log.metadata.from, STATUS.ACTIVE);
  assert.equal(log.metadata.to, STATUS.PAST_DUE);
});

test("transition: passage en cancelled fige cancelledAt et coupe le renouvellement", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();
  const sub = await makeSubRaw(store, plan, STATUS.ACTIVE);

  const cancelled = await StateMachine.transition(sub._id, STATUS.CANCELLED, { reason: "demande client" });
  assert.ok(cancelled.cancelledAt);
  assert.equal(cancelled.isAutoRenew, false);
  assert.equal(cancelled.cancelReason, "demande client");
});

test("snapshot: la creation fige planVersionId, planPriceId et le prix", async () => {
  const store = await makeStore();
  const { plan, version, planPrice } = await makePlanWithVersionAndPrice({ price: 120 });

  const sub = await Provisioning.createSubscription({
    storeId: store._id,
    planId: plan._id,
    billingCycle: "monthly",
    currency: "USD",
    skipEligibility: true,
  });
  created.subs.push(sub._id);

  assert.equal(String(sub.planVersionId), String(version._id));
  assert.equal(String(sub.planPriceId), String(planPrice._id));
  assert.equal(sub.unitPrice, 120);
  assert.equal(sub.finalPrice, 120);
  assert.ok(sub.currentPeriodEnd > sub.currentPeriodStart);
});

test("snapshot: modifier le PlanPrice ensuite ne change pas la subscription existante", async () => {
  const store = await makeStore();
  const { plan, planPrice } = await makePlanWithVersionAndPrice({ price: 200 });

  const sub = await Provisioning.createSubscription({
    storeId: store._id,
    planId: plan._id,
    skipEligibility: true,
  });
  created.subs.push(sub._id);
  assert.equal(sub.unitPrice, 200);

  await PlanPrice.updateOne({ _id: planPrice._id }, { $set: { price: 999 } });

  const reread = await Subscription.findById(sub._id);
  assert.equal(reread.unitPrice, 200, "le prix fige ne doit pas suivre le PlanPrice");
  assert.equal(reread.finalPrice, 200);
  assert.equal(String(reread.planPriceId), String(planPrice._id));
});

test("snapshot: publier une nouvelle version ne deplace pas la subscription existante", async () => {
  const store = await makeStore();
  const { plan, version } = await makePlanWithVersionAndPrice();

  const sub = await Provisioning.createSubscription({
    storeId: store._id,
    planId: plan._id,
    skipEligibility: true,
  });
  created.subs.push(sub._id);

  const v2 = await Catalog.createVersion(plan._id, { featureRefs: [{ code: "builder", enabled: false }] });
  await Catalog.publishVersion(plan._id, v2._id);

  const reread = await Subscription.findById(sub._id);
  assert.equal(String(reread.planVersionId), String(version._id), "reste sur la version d origine");
});

test("unicite: une seule subscription occupante par store, 2e refusee en 409", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();

  const first = await Provisioning.createSubscription({
    storeId: store._id,
    planId: plan._id,
    skipEligibility: true,
  });
  created.subs.push(first._id);

  await assert.rejects(
    () =>
      Provisioning.createSubscription({
        storeId: store._id,
        planId: plan._id,
        skipEligibility: true,
      }),
    (e) => e.code === "SUBSCRIPTION_ALREADY_ACTIVE" && e.status === 409
  );
});

test("unicite: l index Mongo bloque aussi une insertion directe concurrente", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();

  await makeSubRaw(store, plan, STATUS.ACTIVE);

  await assert.rejects(
    () => makeSubRaw(store, plan, STATUS.TRIALING),
    (e) => e.code === 11000,
    "l index partiel unique doit lever E11000"
  );
});

test("unicite: une subscription annulee libere la place", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();

  const first = await makeSubRaw(store, plan, STATUS.ACTIVE);
  await StateMachine.transition(first._id, STATUS.CANCELLED, { reason: "liberation" });

  const second = await makeSubRaw(store, plan, STATUS.ACTIVE);
  assert.ok(second._id, "une nouvelle subscription doit etre possible");
});

test("trial: unique par Store, annuler puis re-souscrire ne redonne pas de trial", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();

  assert.equal(await TrialEngine.hasStoreUsedTrial(store._id), false);

  const sub = await makeSubRaw(store, plan, STATUS.TRIALING);
  await Subscription.updateOne(
    { _id: sub._id },
    { $set: { trialEndsAt: new Date(Date.now() + 86400000), trialPeriod: true } }
  );

  assert.equal(await TrialEngine.hasStoreUsedTrial(store._id), true);

  await StateMachine.transition(sub._id, STATUS.CANCELLED, { reason: "contournement teste" });

  assert.equal(
    await TrialEngine.hasStoreUsedTrial(store._id),
    true,
    "l historique doit rester detecte apres annulation"
  );
  assert.equal(
    await TrialEngine.computeTrialEndDate(store._id),
    null,
    "aucun nouveau trial ne doit etre accorde"
  );
});

test("trial: un autre store garde son droit au trial", async () => {
  const storeA = await makeStore();
  const storeB = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();

  const sub = await makeSubRaw(storeA, plan, STATUS.TRIALING);
  await Subscription.updateOne({ _id: sub._id }, { $set: { trialPeriod: true } });

  assert.equal(await TrialEngine.hasStoreUsedTrial(storeA._id), true);
  assert.equal(await TrialEngine.hasStoreUsedTrial(storeB._id), false, "isolation cross-store");
});

test("grace: le job suspend une grace expiree via la machine a etats", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();
  const sub = await makeSubRaw(store, plan, STATUS.PAST_DUE);

  await StateMachine.transition(sub._id, STATUS.GRACE_PERIOD, {
    reason: "echec de renouvellement",
    extra: { graceEndsAt: new Date(Date.now() - 3600 * 1000) },
  });

  const inGrace = await Subscription.findById(sub._id);
  assert.equal(inGrace.status, STATUS.GRACE_PERIOD);
  assert.ok(inGrace.graceEndsAt);

  const suspended = await suspendExpiredGracePeriods();
  assert.ok(suspended >= 1, "au moins une suspension");

  const after = await Subscription.findById(sub._id);
  assert.equal(after.status, STATUS.SUSPENDED);
});

test("grace: une grace non expiree n est pas suspendue", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();
  const sub = await makeSubRaw(store, plan, STATUS.PAST_DUE);

  await StateMachine.transition(sub._id, STATUS.GRACE_PERIOD, {
    extra: { graceEndsAt: new Date(Date.now() + 86400000) },
  });

  await suspendExpiredGracePeriods();

  const after = await Subscription.findById(sub._id);
  assert.equal(after.status, STATUS.GRACE_PERIOD, "la grace encore valide doit tenir");
});

test("grace: repasser en active efface graceEndsAt", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();
  const sub = await makeSubRaw(store, plan, STATUS.PAST_DUE);

  await StateMachine.transition(sub._id, STATUS.GRACE_PERIOD, {
    extra: { graceEndsAt: new Date(Date.now() + 86400000) },
  });
  const back = await StateMachine.transition(sub._id, STATUS.ACTIVE, { reason: "paiement recu" });

  assert.equal(back.status, STATUS.ACTIVE);
  assert.equal(back.graceEndsAt, null);
});

test("creation: plan sans version publiee refuse", async () => {
  const store = await makeStore();
  const plan = await Catalog.createPlan({ name: uid("plan"), slug: uid("plan").toLowerCase() });
  created.plans.push(plan._id);

  await assert.rejects(
    () => Provisioning.createSubscription({ storeId: store._id, planId: plan._id, skipEligibility: true }),
    (e) => e.code === "PLAN_HAS_NO_PUBLISHED_VERSION"
  );
});

test("creation: aucun tarif actif pour la devise/cycle demande refuse", async () => {
  const store = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice({ currency: "USD", cycle: "monthly" });

  await assert.rejects(
    () =>
      Provisioning.createSubscription({
        storeId: store._id,
        planId: plan._id,
        currency: "EUR",
        skipEligibility: true,
      }),
    (e) => e.code === "PLAN_PRICE_NOT_FOUND"
  );
});

test("isolation: une transition ne touche que la subscription ciblee", async () => {
  const storeA = await makeStore();
  const storeB = await makeStore();
  const { plan } = await makePlanWithVersionAndPrice();

  const subA = await makeSubRaw(storeA, plan, STATUS.ACTIVE);
  const subB = await makeSubRaw(storeB, plan, STATUS.ACTIVE);

  await StateMachine.transition(subA._id, STATUS.SUSPENDED, { reason: "isolation testee" });

  assert.equal((await Subscription.findById(subA._id)).status, STATUS.SUSPENDED);
  assert.equal((await Subscription.findById(subB._id)).status, STATUS.ACTIVE, "store B intact");
});
