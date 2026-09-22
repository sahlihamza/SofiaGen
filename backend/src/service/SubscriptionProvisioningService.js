const mongoose = require("mongoose");
const dayjs = require("dayjs");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const PlanVersion = require("../models/PlanVersion");
const PlanPrice = require("../models/PlanPrice");
const Store = require("../models/Store");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const PlanEligibilityService = require("./PlanEligibilityService");
const TrialEngineService = require("./TrialEngineService");
const logger = require("../config/logger");
const { emitEvent } = require("../lib/eventBus");
const { STATUS, OCCUPYING_STATUSES, expandForQuery } = require("../utils/subscriptionStatus");

const CYCLE_MONTHS = { monthly: 1, quarterly: 3, semi_annual: 6, yearly: 12 };

const badRequest = (message, code = "BAD_REQUEST") => {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
};

const notFound = (message) => {
  const err = new Error(message);
  err.status = 404;
  err.code = "NOT_FOUND";
  return err;
};

const conflict = (message, code = "CONFLICT") => {
  const err = new Error(message);
  err.status = 409;
  err.code = code;
  return err;
};

const addBillingCycle = (from, cycle) => {
  const months = CYCLE_MONTHS[cycle];
  if (!months) throw badRequest(`Cycle de facturation inconnu : "${cycle}"`);
  return dayjs(from).add(months, "month").toDate();
};

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

const resolveActivePrice = async ({ planId, cycle, currency }) => {
  const now = new Date();
  const price = await PlanPrice.findOne({
    planId,
    cycle,
    currency,
    status: "active",
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: null }, { effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }],
  }).sort({ effectiveFrom: -1 });

  return price;
};

const createSubscription = async ({
  storeId,
  planId,
  billingCycle = "monthly",
  currency = "USD",
  actorId = null,
  skipEligibility = false,
} = {}) => {
  if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
    throw badRequest("storeId invalide");
  }
  if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
    throw badRequest("planId invalide");
  }

  const store = await Store.findById(storeId);
  if (!store || store.deletedAt) throw notFound("Store introuvable");

  const existing = await Subscription.findOne({
    storeId,
    status: { $in: expandForQuery(OCCUPYING_STATUSES) },
  });
  if (existing) {
    throw conflict(
      "Ce store posséde déjà un abonnement en cours",
      "SUBSCRIPTION_ALREADY_ACTIVE"
    );
  }

  const plan = await Plan.findOne({ _id: planId, deletedAt: null });
  if (!plan) throw notFound("Plan introuvable");

  if (!plan.currentVersionId) {
    throw conflict(
      `Le plan "${plan.name}" n'a aucune version publié`,
      "PLAN_HAS_NO_PUBLISHED_VERSION"
    );
  }

  const planVersion = await PlanVersion.findById(plan.currentVersionId);
  if (!planVersion) throw notFound("PlanVersion introuvable");

  const planPrice = await resolveActivePrice({ planId, cycle: billingCycle, currency });
  if (!planPrice) {
    throw conflict(
      `Aucun tarif actif pour ${plan.name} en ${currency}/${billingCycle}`,
      "PLAN_PRICE_NOT_FOUND"
    );
  }

  if (!skipEligibility) {
    await PlanEligibilityService.assertEligible(storeId, planId, { context: "subscribe" });
  }

  const trialEndsAt = await TrialEngineService.computeTrialEndDate(storeId);
  const startedAt = new Date();

  const unitPrice = round2(planPrice.price);
  const tax = round2(planPrice.taxIncluded ? 0 : unitPrice * (Number(planPrice.taxRate) || 0));
  const discount = 0;
  const finalPrice = round2(Math.max(unitPrice + tax - discount, 0));

  let subscription;
  try {
    subscription = await Subscription.create({
      storeId,
      planId: plan._id,
      planVersionId: planVersion._id,
      planPriceId: planPrice._id,
      planVersion: planVersion.version,
      status: trialEndsAt ? STATUS.TRIALING : STATUS.ACTIVE,
      billingCycle,
      currency,
      unitPrice,
      tax,
      discount,
      finalPrice,
      basePriceInCurrency: unitPrice,
      startedAt,
      currentPeriodStart: startedAt,
      currentPeriodEnd: addBillingCycle(startedAt, billingCycle),
      trialPeriod: Boolean(trialEndsAt),
      trialEndsAt: trialEndsAt || undefined,
      trialStartDate: trialEndsAt ? startedAt : undefined,
      trialEndDate: trialEndsAt || undefined,
      currentPlanName: plan.name,
      createdBy: actorId,
      updatedBy: actorId,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw conflict(
        "Ce store posséde déjà un abonnement en cours",
        "SUBSCRIPTION_ALREADY_ACTIVE"
      );
    }
    throw err;
  }

  try {
    await SubscriptionEvent.create({
      subscriptionId: subscription._id,
      storeId: subscription.storeId,
      planId: subscription.planId,
      type: "created",
      message: `Subscription créé sur "${plan.name}" v${planVersion.version}`,
      payload: {
        planVersionId: String(planVersion._id),
        planPriceId: String(planPrice._id),
        unitPrice,
        finalPrice,
        trialEndsAt,
      },
      status: "info",
    });
  } catch (err) {
    logger.error(`SubscriptionProvisioning: event non enregistre: ${err.message}`);
  }

  await Store.updateOne(
    { _id: storeId },
    {
      $set: {
        currentSubscriptionId: subscription._id,
        subscriptionStatus: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    }
  );

  emitEvent("subscription.created", {
    storeId,
    entityId: subscription._id,
    metadata: { planId: String(plan._id), status: subscription.status, finalPrice },
  });

  return subscription;
};

module.exports = {
  createSubscription,
  resolveActivePrice,
  addBillingCycle,
  CYCLE_MONTHS,
};
