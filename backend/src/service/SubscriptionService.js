const mongoose = require("mongoose");
const dayjs = require("dayjs");
const Subscription = require("../models/Subscription");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const logger = require("../config/logger");
const Plan = require("../models/Plan");
const Store = require("../models/Store");
const PlanQuota = require("../models/PlanQuota");
const StoreUsage = require("../models/StoreUsage");
const Invoice = require("../models/Invoice");
const SubscriptionHistory = require("../models/SubscriptionHistory");
const PlanAuditLog = require("../models/PlanAuditLog");
const { emitEvent } = require("../lib/eventBus");
const { getSubscriptionStatusForAssignment } = require("../utils/subscriptionRules");

const createSubscriptionEvent = (subscription, type, message, data, actor) => {
  if (Array.isArray(subscription?.events)) {
    subscription.events.push({ type, message, data, actor, createdAt: new Date() });
  }

  if (!subscription?._id || !subscription?.storeId) return Promise.resolve(null);

  return SubscriptionEvent.create({
    subscriptionId: subscription._id,
    storeId: subscription.storeId,
    planId: subscription.planId,
    type,
    message,
    payload: data || {},
    actor,
  }).catch((err) => {
    logger.error(`SubscriptionService: failed to record subscription event "${type}": ${err.message}`);
  });
};

const getAllSubscriptions = async ({
  page = 1,
  limit = 20,
  status = "",
  storeId = "",
  planId = "",
  search = "",
  sort = "-createdAt",
} = {}) => {
  const query = {};
  if (status) query.status = status;
  if (storeId) query.storeId = storeId;
  if (planId) query.planId = planId;
  if (search) {
    query.$or = [
      { "storeId.name": { $regex: search, $options: "i" } },
      { "planId.name": { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Subscription.countDocuments(query);
  const subscriptions = await Subscription.find(query)
    .populate("storeId", "name owner planName planSlug subscriptionStatus")
    .populate("planId", "name slug pricing")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    data: subscriptions,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / limit),
    },
  };
};

const getSubscriptionById = async (id) => {
  const subscription = await Subscription.findById(id)
    .populate("storeId", "name owner email planName planSlug")
    .populate("planId", "name slug pricing features quotas")
    .populate("currentPlan.planId", "name slug")
    .populate("pendingPlan.planId", "name slug");
  if (!subscription) throw new Error("Subscription not found");
  return subscription;
};

const upgradeSubscription = async (req, res) => {
  const { id } = req.params;
  const { targetPlanId, billingCycle, startDate, trialDays } = req.body;

  const subscription = await Subscription.findById(id);
  if (!subscription) throw new Error("Subscription not found");
  if (["canceled", "expired", "suspended"].includes(subscription.status)) {
    throw new Error("Only active, trial, or past_due subscriptions can be changed");
  }

  const targetPlan = await Plan.findById(targetPlanId);
  if (!targetPlan) throw new Error("Target plan not found");
  if (subscription.planId?.toString() === targetPlanId) {
    throw new Error("Subscription is already on the requested plan");
  }

  const store = await Store.findById(subscription.storeId);
  if (!store) throw new Error("Store not found");

  const currentMonthly = subscription.priceSnapshot?.monthly || 0;
  const targetMonthly = targetPlan.pricing?.monthly || 0;
  const targetYearly = targetPlan.pricing?.yearly || 0;
  const effectiveBillingCycle = billingCycle || subscription.billingCycle || "monthly";
  const effectiveMonthly = effectiveBillingCycle === "yearly" ? targetYearly : targetMonthly;
  const currentYearly = subscription.priceSnapshot?.yearly || targetYearly;

  const isDowngrade = effectiveMonthly < currentMonthly;
  const overQuotaItems = [];

  if (isDowngrade) {
    const planQuotas = await PlanQuota.find({ planId: targetPlan._id });
    const storeUsages = await StoreUsage.find({ storeId: store._id });
    const usageByCode = new Map(storeUsages.map((u) => [u.quotaTypeCode, u.used]));

    for (const pq of planQuotas) {
      const used = usageByCode.get(pq.quotaTypeCode) || 0;
      if (used > pq.limitValue) {
        overQuotaItems.push({
          quotaKey: pq.quotaTypeCode,
          current: used,
          newLimit: pq.limitValue,
          excess: used - pq.limitValue,
        });
      }
    }

    if (overQuotaItems.length > 0) {
      subscription.downgradeBlocked = true;
      subscription.downgradeBlockReason = `Cannot downgrade: ${overQuotaItems.map((i) => `${i.quotaKey}: ${i.current} used, limit ${i.newLimit}`).join("; ")}`;
      createSubscriptionEvent(
        subscription,
        "downgrade_blocked",
        `Downgrade blocked due to over-quota: ${subscription.downgradeBlockReason}`,
        { overQuotaItems },
        req.user?._id
      );
      await subscription.save();
      throw new Error(subscription.downgradeBlockReason);
    }
  }

  const previousPlanId = subscription.planId;
  const effectiveStart = startDate ? new Date(startDate) : dayjs().toDate();
  const effectiveStatus = getSubscriptionStatusForAssignment({ trialDays });
  const currentPeriodEnd = dayjs(effectiveStart).add(1, effectiveBillingCycle === "yearly" ? "year" : "month").toDate();

  subscription.planId = targetPlan._id;
  subscription.currentPlanName = targetPlan.name;
  subscription.startedAt = effectiveStart;
  subscription.currentPeriodStart = effectiveStart;
  subscription.status = effectiveStatus;
  subscription.billingCycle = effectiveBillingCycle;
  subscription.priceSnapshot = {
    monthly: targetMonthly,
    yearly: targetYearly,
    currency: targetPlan.pricing?.currency || "USD",
    taxIncluded: targetPlan.pricing?.taxIncluded || false,
  };
  subscription.currency = targetPlan.pricing?.currency || "USD";
  subscription.basePriceInCurrency = targetPlan.pricing?.monthly;
  subscription.currentPlan = {
    planId: targetPlan._id,
    effectiveFrom: effectiveStart,
  };
  subscription.billingCycleDay = new Date(effectiveStart).getDate();
  subscription.trialPeriod = Number(trialDays) > 0;
  subscription.trialEndsAt = trialDays ? dayjs(effectiveStart).add(trialDays, "day").toDate() : undefined;
  subscription.trialStartDate = Number(trialDays) > 0 ? effectiveStart : subscription.trialStartDate;
  subscription.trialEndDate = Number(trialDays) > 0 ? subscription.trialEndsAt : subscription.trialEndDate;
  subscription.currentPeriodEnd = currentPeriodEnd;
  subscription.nextBillingDate = currentPeriodEnd;
  subscription.isAutoRenew = subscription.isAutoRenew ?? true;
  subscription.updatedBy = req.user?._id;

  createSubscriptionEvent(
    subscription,
    "upgraded",
    `Subscription upgraded to plan ${targetPlan.name}`,
    { previousPlanId, targetPlanId, billingCycle: effectiveBillingCycle },
    req.user?._id
  );

  await subscription.save();

  if (previousPlanId) {
    await PlanAuditLog.create({
      planId: previousPlanId,
      storeId: store._id,
      subscriptionId: subscription._id,
      action: "subscription_upgraded",
      previousValue: { planId: previousPlanId },
      newValue: { planId: targetPlanId },
      actor: req.user?._id,
      ip: req.ip,
      metadata: { billingCycle: effectiveBillingCycle },
    });
  }

  store.subscriptionStatus = subscription.status;
  store.currentSubscriptionId = subscription._id;
  await store.save();

  return subscription;
};

const downgradeSubscription = async (req, res) => {
  const { id } = req.params;
  const { targetPlanId, billingCycle, startDate, trialDays } = req.body;

  const subscription = await Subscription.findById(id);
  if (!subscription) throw new Error("Subscription not found");
  if (["canceled", "expired", "suspended"].includes(subscription.status)) {
    throw new Error("Only active, trial, or past_due subscriptions can be changed");
  }

  const targetPlan = await Plan.findById(targetPlanId);
  if (!targetPlan) throw new Error("Target plan not found");
  if (subscription.planId?.toString() === targetPlanId) {
    throw new Error("Subscription is already on the requested plan");
  }

  const store = await Store.findById(subscription.storeId);
  if (!store) throw new Error("Store not found");

  const currentMonthly = subscription.priceSnapshot?.monthly || 0;
  const targetMonthly = targetPlan.pricing?.monthly || 0;
  const targetYearly = targetPlan.pricing?.yearly || 0;
  const effectiveBillingCycle = billingCycle || subscription.billingCycle || "monthly";
  const effectiveMonthly = effectiveBillingCycle === "yearly" ? targetYearly : targetMonthly;

  const isDowngrade = effectiveMonthly < currentMonthly;
  const overQuotaItems = [];

  if (isDowngrade) {
    const planQuotas = await PlanQuota.find({ planId: targetPlan._id });
    const storeUsages = await StoreUsage.find({ storeId: store._id });
    const usageByCode = new Map(storeUsages.map((u) => [u.quotaTypeCode, u.used]));

    for (const pq of planQuotas) {
      const used = usageByCode.get(pq.quotaTypeCode) || 0;
      if (used > pq.limitValue) {
        overQuotaItems.push({
          quotaKey: pq.quotaTypeCode,
          current: used,
          newLimit: pq.limitValue,
          excess: used - pq.limitValue,
        });
      }
    }

    if (overQuotaItems.length > 0) {
      subscription.downgradeBlocked = true;
      subscription.downgradeBlockReason = `Cannot downgrade: ${overQuotaItems.map((i) => `${i.quotaKey}: ${i.current} used, limit ${i.newLimit}`).join("; ")}`;
      createSubscriptionEvent(
        subscription,
        "downgrade_blocked",
        `Downgrade blocked due to over-quota: ${subscription.downgradeBlockReason}`,
        { overQuotaItems },
        req.user?._id
      );
      await subscription.save();
      throw new Error(subscription.downgradeBlockReason);
    }
  }

  const previousPlanId = subscription.planId;
  const effectiveStart = startDate ? new Date(startDate) : dayjs().toDate();
  const effectiveStatus = getSubscriptionStatusForAssignment({ trialDays });
  const currentPeriodEnd = dayjs(effectiveStart).add(1, effectiveBillingCycle === "yearly" ? "year" : "month").toDate();

  subscription.planId = targetPlan._id;
  subscription.currentPlanName = targetPlan.name;
  subscription.startedAt = effectiveStart;
  subscription.currentPeriodStart = effectiveStart;
  subscription.status = effectiveStatus;
  subscription.billingCycle = effectiveBillingCycle;
  subscription.priceSnapshot = {
    monthly: targetMonthly,
    yearly: targetYearly,
    currency: targetPlan.pricing?.currency || "USD",
    taxIncluded: targetPlan.pricing?.taxIncluded || false,
  };
  subscription.currency = targetPlan.pricing?.currency || "USD";
  subscription.basePriceInCurrency = targetPlan.pricing?.monthly;
  subscription.currentPlan = {
    planId: targetPlan._id,
    effectiveFrom: effectiveStart,
  };
  subscription.billingCycleDay = new Date(effectiveStart).getDate();
  subscription.trialPeriod = Number(trialDays) > 0;
  subscription.trialEndsAt = trialDays ? dayjs(effectiveStart).add(trialDays, "day").toDate() : undefined;
  subscription.trialStartDate = Number(trialDays) > 0 ? effectiveStart : subscription.trialStartDate;
  subscription.trialEndDate = Number(trialDays) > 0 ? subscription.trialEndsAt : subscription.trialEndDate;
  subscription.currentPeriodEnd = currentPeriodEnd;
  subscription.nextBillingDate = currentPeriodEnd;
  subscription.isAutoRenew = subscription.isAutoRenew ?? true;
  subscription.updatedBy = req.user?._id;

  createSubscriptionEvent(
    subscription,
    "downgraded",
    `Subscription downgraded to plan ${targetPlan.name}`,
    { previousPlanId, targetPlanId, billingCycle: effectiveBillingCycle },
    req.user?._id
  );

  await subscription.save();

  if (previousPlanId) {
    await PlanAuditLog.create({
      planId: previousPlanId,
      storeId: store._id,
      subscriptionId: subscription._id,
      action: "subscription_downgraded",
      previousValue: { planId: previousPlanId },
      newValue: { planId: targetPlanId },
      actor: req.user?._id,
      ip: req.ip,
      metadata: { billingCycle: effectiveBillingCycle },
    });
  }

  store.subscriptionStatus = subscription.status;
  store.currentSubscriptionId = subscription._id;
  await store.save();

  return subscription;
};

const suspendSubscription = async (id, actor) => {
  const subscription = await Subscription.findById(id);
  if (!subscription) throw new Error("Subscription not found");
  if (subscription.status === "suspended") throw new Error("Subscription is already suspended");

  subscription.status = "suspended";
  subscription.isAutoRenew = false;
  subscription.updatedBy = actor;

  createSubscriptionEvent(subscription, "suspended", "Subscription suspended", {}, actor);
  await subscription.save();

  const store = await Store.findById(subscription.storeId);
  if (store && store.currentSubscriptionId?.toString() === id) {
    store.subscriptionStatus = "suspended";
    await store.save();
  }

  return subscription;
};

const cancelSubscription = async (id, reason, actor) => {
  const subscription = await Subscription.findById(id);
  if (!subscription) throw new Error("Subscription not found");
  if (["canceled", "expired"].includes(subscription.status)) {
    throw new Error("Subscription is already canceled or expired");
  }

  subscription.status = "canceled";
  subscription.cancelReason = reason;
  subscription.cancelledAt = new Date();
  subscription.isAutoRenew = false;
  subscription.updatedBy = actor;

  createSubscriptionEvent(subscription, "canceled", `Subscription canceled: ${reason || "no reason"}`, {}, actor);
  await subscription.save();

  const store = await Store.findById(subscription.storeId);
  if (store && store.currentSubscriptionId?.toString() === id) {
    store.subscriptionStatus = "canceled";
    await store.save();
  }

  emitEvent("subscription.cancelled", {
    storeId: subscription.storeId,
    entityId: subscription._id,
    metadata: { planName: subscription.currentPlanName || "" },
    actionUrl: "/store/my-subscription",
  });

  return subscription;
};

const renewSubscription = async (id, actor) => {
  const subscription = await Subscription.findById(id);
  if (!subscription) throw new Error("Subscription not found");
  if (!["active", "trial"].includes(subscription.status)) {
    throw new Error("Only active or trial subscriptions can be renewed");
  }

  const plan = await Plan.findById(subscription.planId);
  if (!plan) throw new Error("Plan not found");

  const billingCycle = subscription.billingCycle || "monthly";
  const periodStart = subscription.currentPeriodEnd || dayjs().toDate();
  const periodEnd = dayjs(periodStart).add(1, billingCycle === "yearly" ? "year" : "month").toDate();

  subscription.currentPeriodStart = periodStart;
  subscription.currentPeriodEnd = periodEnd;
  subscription.nextBillingDate = periodEnd;
  subscription.startedAt = subscription.startedAt || periodStart;
  subscription.updatedBy = actor;

  createSubscriptionEvent(subscription, "renewed", "Subscription renewed", { periodStart, periodEnd }, actor);
  await subscription.save();

  const store = await Store.findById(subscription.storeId);
  if (store && store.currentSubscriptionId?.toString() === id) {
    store.subscriptionStatus = "active";
    store.currentPeriodEnd = periodEnd;
    store.nextBillingDate = periodEnd;
    await store.save();
  }

  emitEvent("subscription.renewed", {
    storeId: subscription.storeId,
    entityId: subscription._id,
    metadata: { planName: subscription.currentPlanName || "" },
    actionUrl: "/store/my-subscription",
  });

  return subscription;
};

const resumeSubscription = async (id, actor) => {
  const subscription = await Subscription.findById(id);
  if (!subscription) throw new Error("Subscription not found");
  if (!["canceled", "suspended", "expired"].includes(subscription.status)) {
    throw new Error("Only canceled, suspended or expired subscriptions can be resumed");
  }

  subscription.status = "active";
  subscription.isAutoRenew = true;
  subscription.updatedBy = actor;

  const now = new Date();
  const billingCycle = subscription.billingCycle || "monthly";
  const periodEnd = dayjs().add(1, billingCycle === "yearly" ? "year" : "month").toDate();

  subscription.currentPeriodStart = now;
  subscription.currentPeriodEnd = periodEnd;
  subscription.nextBillingDate = periodEnd;
  subscription.cancelledAt = undefined;
  subscription.cancelReason = undefined;

  createSubscriptionEvent(subscription, "activated", "Subscription resumed", { periodStart: now, periodEnd }, actor);
  await subscription.save();

  const store = await Store.findById(subscription.storeId);
  if (store && store.currentSubscriptionId?.toString() === id) {
    store.subscriptionStatus = "active";
    store.currentPeriodEnd = periodEnd;
    store.nextBillingDate = periodEnd;
    await store.save();
  }

  return subscription;
};

const applyCouponToSubscription = async (id, code, actor) => {
  const subscription = await Subscription.findById(id);
  if (!subscription) throw new Error("Subscription not found");

  const coupon = await PlatformCoupon.findOne({ code: code.toUpperCase(), status: "active" });
  if (!coupon) throw new Error("Coupon not found or inactive");

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    throw new Error("Coupon is not yet active");
  }
  if (coupon.endDate && new Date(coupon.endDate) < now) {
    throw new Error("Coupon has expired");
  }

  const alreadyApplied = subscription.appliedCoupons.some((c) => c.couponId?.toString() === coupon._id.toString() || c.code === coupon.code);
  if (alreadyApplied) {
    throw new Error("Coupon already applied to this subscription");
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }

  subscription.appliedCoupons.push({
    couponId: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountAmount: coupon.discountValue,
    appliedAt: now,
    expiresAt: coupon.endDate,
    maxUses: coupon.usageLimit,
    usedCount: 0,
  });

  createSubscriptionEvent(subscription, "coupon_applied", `Coupon ${coupon.code} applied`, { couponId: coupon._id, code: coupon.code }, actor);
  await subscription.save();

  return subscription;
};

const assignPlanToStore = async ({ storeId, planId, billingCycle, trialDays, actor }) => {
  const store = await Store.findById(storeId);
  if (!store) throw new Error("Store not found");

  const plan = await Plan.findById(planId);
  if (!plan) throw new Error("Plan not found");

  const existingActive = await Subscription.findOne({
    storeId,
    status: { $in: ["active", "trial", "past_due"] },
  });

  if (existingActive) {
    createSubscriptionEvent(
      existingActive,
      "canceled",
      "Previous subscription canceled to assign a new plan",
      { replacedByPlanId: planId },
      actor
    );
    existingActive.status = "canceled";
    existingActive.cancelledAt = new Date();
    existingActive.updatedBy = actor;
    await existingActive.save();
  }

  const samePlanSubscription = await Subscription.findOne({
    storeId,
    planId,
    status: { $in: ["active", "trial", "past_due"] },
  });

  let subscription;

  if (samePlanSubscription) {
    subscription = samePlanSubscription;
    const previousStatus = subscription.status;
    subscription.currentPlanName = plan.name;
    subscription.planVersion = plan.version || 1;
    subscription.planSnapshot = {
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      badge: plan.badge,
      color: plan.color,
      icon: plan.icon,
      pricing: plan.pricing,
      features: plan.features,
      limits: plan.limits,
      featureRefs: plan.features?.map((f) => f.featureId),
      quotaRefs: plan.quotas?.map((q) => q.quotaId),
    };
    subscription.status = getSubscriptionStatusForAssignment({ trialDays });
    subscription.billingCycle = billingCycle || "monthly";
    subscription.priceSnapshot = {
      monthly: plan.pricing?.monthly,
      yearly: plan.pricing?.yearly,
      currency: plan.pricing?.currency || "USD",
      taxIncluded: plan.pricing?.taxIncluded || false,
    };
    subscription.currency = plan.pricing?.currency || "USD";
    subscription.basePriceInCurrency = plan.pricing?.monthly;
    subscription.currentPlan = {
      planId: plan._id,
      effectiveFrom: new Date(),
    };
    subscription.billingCycleDay = new Date().getDate();
    subscription.trialEndsAt = trialDays ? dayjs().add(trialDays, "day").toDate() : undefined;
    subscription.currentPeriodEnd = dayjs().add(1, billingCycle === "yearly" ? "year" : "month").toDate();
    subscription.nextBillingDate = subscription.currentPeriodEnd;
    subscription.isAutoRenew = true;
    subscription.billingAddress = subscription.billingAddress || {};
    subscription.updatedBy = actor;

    createSubscriptionEvent(
      subscription,
      "reactivated",
      `Subscription reactivated on plan ${plan.name}`,
      { previousStatus, billingCycle },
      actor
    );
  } else {
    const status = getSubscriptionStatusForAssignment({ trialDays });
    const currentPeriodStart = new Date();
    const currentPeriodEnd = dayjs(currentPeriodStart).add(1, billingCycle === "yearly" ? "year" : "month").toDate();

    subscription = new Subscription({
      storeId,
      planId,
      planVersion: plan.version || 1,
      planSnapshot: {
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        badge: plan.badge,
        color: plan.color,
        icon: plan.icon,
        pricing: plan.pricing,
        features: plan.features,
        limits: plan.limits,
        featureRefs: plan.features?.map((f) => f.featureId),
        quotaRefs: plan.quotas?.map((q) => q.quotaId),
      },
      currentPlanName: plan.name,
      startedAt: currentPeriodStart,
      currentPeriodStart,
      currentPeriodEnd,
      status,
      billingCycle: billingCycle || "monthly",
      priceSnapshot: {
        monthly: plan.pricing?.monthly,
        yearly: plan.pricing?.yearly,
        currency: plan.pricing?.currency || "USD",
        taxIncluded: plan.pricing?.taxIncluded || false,
      },
      currency: plan.pricing?.currency || "USD",
      basePriceInCurrency: plan.pricing?.monthly,
      currentPlan: {
        planId: plan._id,
        effectiveFrom: currentPeriodStart,
      },
      billingCycleDay: new Date().getDate(),
      trialPeriod: Number(trialDays) > 0,
      trialEndsAt: trialDays ? dayjs(currentPeriodStart).add(trialDays, "day").toDate() : undefined,
      trialStartDate: Number(trialDays) > 0 ? currentPeriodStart : undefined,
      trialEndDate: Number(trialDays) > 0 ? dayjs(currentPeriodStart).add(trialDays, "day").toDate() : undefined,
      isAutoRenew: true,
      createdBy: actor,
      updatedBy: actor,
    });

    createSubscriptionEvent(subscription, "created", `Subscription created for plan ${plan.name}`, { billingCycle, trialDays }, actor);
  }

  await subscription.save();

  store.subscriptionStatus = subscription.status;
  store.currentSubscriptionId = subscription._id;
  await store.save();

  emitEvent("subscription.created", {
    storeId: subscription.storeId,
    entityId: subscription._id,
    metadata: { planName: plan.name },
    actionUrl: "/store/my-subscription",
  });

  return subscription;
};

const getSubscriptionHistory = async ({ storeId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const query = storeId ? { storeId } : {};
  const total = await SubscriptionHistory.countDocuments(query);
  const history = await SubscriptionHistory.find(query)
    .populate("storeId", "name")
    .populate("subscriptionId", "status billingCycle")
    .populate("planId", "name slug")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    data: history,
    pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / limit) },
  };
};

const getAllSubscriptionHistory = async ({ page = 1, limit = 20, storeId, planId, status, search, sort = "-createdAt" } = {}) => {
  const query = {};
  if (storeId) query.storeId = storeId;
  if (planId) query.planId = planId;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { "storeId.name": { $regex: search, $options: "i" } },
      { "planId.name": { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await SubscriptionHistory.countDocuments(query);
  const history = await SubscriptionHistory.find(query)
    .populate("storeId", "name owner")
    .populate("planId", "name slug")
    .populate("subscriptionId", "status billingCycle")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    data: history,
    pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / limit) },
  };
};

const getAllSubscriptionEvents = async ({ page = 1, limit = 20, storeId, planId, status, search, sort = "-createdAt" } = {}) => {
  const query = {};
  if (storeId) query.storeId = storeId;
  if (planId) query.planId = planId;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { "storeId.name": { $regex: search, $options: "i" } },
      { "planId.name": { $regex: search, $options: "i" } },
      { "events.message": { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await Subscription.countDocuments(query);
  const subscriptions = await Subscription.find(query)
    .populate("storeId", "name")
    .populate("planId", "name slug")
    .select("storeId planId status billingCycle events")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit, 10));

  const allEvents = subscriptions.flatMap((sub) =>
    (sub.events || []).map((event) => ({
      store: sub.storeId,
      plan: sub.planId,
      subscriptionId: sub._id,
      type: event.type,
      message: event.message,
      data: event.data,
      actor: event.actor,
      createdAt: event.createdAt,
    }))
  );

  const sortedEvents = allEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const pagedEvents = sortedEvents.slice(skip, skip + parseInt(limit, 10));

  return {
    data: pagedEvents,
    pagination: { total: sortedEvents.length, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(sortedEvents.length / limit) },
  };
};

const getTrialSubscriptions = async ({ page = 1, limit = 20, sort = "-createdAt" } = {}) => {
  const skip = (page - 1) * limit;
  const query = { status: "trial" };
  const total = await Subscription.countDocuments(query);
  const subscriptions = await Subscription.find(query)
    .populate("storeId", "name owner")
    .populate("planId", "name slug pricing")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    data: subscriptions,
    pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / limit) },
  };
};

const retryFailedPayment = async (subscriptionId, actor) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");
  if (subscription.chargeFailures >= 3) {
    throw new Error("Maximum retry attempts reached. Subscription suspended.");
  }

  subscription.chargeFailures = (subscription.chargeFailures || 0) + 1;
  subscription.chargeRetryDate = dayjs().add(3, "day").toDate();
  await subscription.save();

  createSubscriptionEvent(
    subscription,
    "payment_retry",
    `Payment retry attempt ${subscription.chargeFailures}`,
    { chargeFailures: subscription.chargeFailures },
    actor
  );

  return subscription;
};

const checkTrialEndings = async () => {
  const trialEndingSoon = await Subscription.find({
    status: "trial",
    trialEndsAt: { $lte: dayjs().add(3, "day").toDate() },
  }).populate("storeId", "name").populate("planId", "name slug");

  const results = [];
  for (const sub of trialEndingSoon) {
    createSubscriptionEvent(
      sub,
      "trial_ending_soon",
      `Trial ending soon for plan ${sub.planId?.name || "unknown"}`,
      { trialEndsAt: sub.trialEndsAt },
      null
    );
    await sub.save();
    results.push(sub);
  }

  return results;
};

const processOverQuotaGracePeriods = async () => {
  const subscriptions = await Subscription.find({
    status: { $in: ["active", "trial"] },
    overQuotaItems: { $ne: [] },
  }).populate("storeId").populate("planId");

  const results = [];
  for (const sub of subscriptions) {
    for (const item of sub.overQuotaItems) {
      if (item.status === "grace_period" && item.graceUntil && new Date(item.graceUntil) < new Date()) {
        item.status = "blocked";
        sub.status = "past_due";
        createSubscriptionEvent(sub, "over_quota_blocked", `Usage limit exceeded for ${item.quotaTypeCode}, subscription blocked`, { quotaTypeCode: item.quotaTypeCode, graceUntil: item.graceUntil }, null);
      }
    }
    await sub.save();
    results.push(sub);
  }

  return results;
};

module.exports = {
  getAllSubscriptions,
  getSubscriptionById,
  upgradeSubscription,
  downgradeSubscription,
  suspendSubscription,
  cancelSubscription,
  renewSubscription,
  resumeSubscription,
  applyCouponToSubscription,
  assignPlanToStore,
  getSubscriptionHistory,
  getAllSubscriptionHistory,
  getAllSubscriptionEvents,
  getTrialSubscriptions,
  retryFailedPayment,
  checkTrialEndings,
  processOverQuotaGracePeriods,
  createSubscriptionEvent,
};