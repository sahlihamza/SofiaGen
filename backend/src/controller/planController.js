const dayjs = require("dayjs");
const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const PlanCatalogService = require("../service/PlanCatalogService");
const Store = require("../models/Store");
const Subscription = require("../models/Subscription");
const StoreUsage = require("../models/StoreUsage");
const PlanAuditLog = require("../models/PlanAuditLog");
const PlanPriceHistory = require("../models/PlanPriceHistory");
const Feature = require("../models/Feature");
const FeatureCategory = require("../models/FeatureCategory");
const QuotaType = require("../models/QuotaType");
const PlanFeature = require("../models/PlanFeature");
const PlanQuota = require("../models/PlanQuota");
const Invoice = require("../models/Invoice");
const SubscriptionHistory = require("../models/SubscriptionHistory");
const PlanVersionService = require("../service/PlanVersionService");
const { normalizePlanFeatures, toLegacyFeatureMap } = require("../utils/planFeatures");
const { normalizePlanQuotas, toLegacyLimitsMap } = require("../utils/planQuotas");
const { getSubscriptionStatusForAssignment } = require("../utils/subscriptionRules");

const buildUsageMapByStore = (storeUsageDocs) => {
  const usageByStore = new Map();
  storeUsageDocs.forEach((doc) => {
    const storeId = String(doc.storeId);
    const quotaKey = doc.quotaTypeId?.code;
    if (!quotaKey) return;
    const existing = usageByStore.get(storeId) || {};
    existing[quotaKey] = doc.used || 0;
    usageByStore.set(storeId, existing);
  });
  return usageByStore;
};

const getStoreUsage = (store, usageByStore) => {
  const usage = usageByStore.get(String(store._id));
  if (usage) {
    return usage;
  }
  if (store.quotaUsage) {
    return Object.fromEntries(store.quotaUsage);
  }
  return {};
};

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createSubscriptionEvent = (subscription, type, message, data, actor) => {
  subscription.events.push({
    type,
    message,
    data,
    actor,
    createdAt: new Date(),
  });
};

const getPlanPrice = (plan, billingCycle) => {
  if (!plan || !plan.pricing) return 0;
  return billingCycle === "yearly"
    ? plan.pricing.yearly ?? plan.pricing.monthly ?? 0
    : plan.pricing.monthly ?? plan.pricing.yearly ?? 0;
};

const changeSubscriptionPlan = async (req, res, action) => {
  try {
    const { id } = req.params;
    const { targetPlanId, billingCycle, trialDays, startDate, isAutoRenew = true } = req.body;

    if (!targetPlanId) {
      return res.status(400).json({ success: false, message: "targetPlanId is required" });
    }

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    if (["canceled", "expired", "suspended"].includes(subscription.status)) {
      return res.status(400).json({
        success: false,
        message: "Only active, trial, or past_due subscriptions can be changed",
      });
    }

    if (subscription.planId?.toString() === targetPlanId) {
      return res.status(400).json({
        success: false,
        message: "Subscription is already on the requested plan",
      });
    }

    const targetPlan = await Plan.findById(targetPlanId);
    if (!targetPlan) {
      return res.status(404).json({ success: false, message: "Target plan not found" });
    }

    const store = await Store.findById(subscription.storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const currentMonthly = subscription.priceSnapshot?.monthly || 0;
    const targetMonthly = targetPlan.pricing?.monthly || 0;
    if (action === "upgraded" && targetMonthly <= currentMonthly) {
      return res.status(400).json({
        success: false,
        message: "Target plan must be more expensive than the current plan to upgrade",
      });
    }
    if (action === "downgraded" && targetMonthly >= currentMonthly) {
      return res.status(400).json({
        success: false,
        message: "Target plan must be cheaper than the current plan to downgrade",
      });
    }

    // Over-quota protection for downgrades
    if (action === "downgraded") {
      const targetQuotas = targetPlan.limits || new Map();
      const storeUsageDocs = await StoreUsage.find({ storeId: store._id }).populate("quotaTypeId", "code");
      const usageByStore = buildUsageMapByStore(storeUsageDocs);

      const overQuotaItems = [];
      let hasOverQuota = false;

      for (const [quotaKey, newLimit] of Object.entries(Object.fromEntries(targetQuotas))) {
        const currentUsage = usageByStore[String(store._id)]?.[quotaKey] || 0;
        if (newLimit !== null && newLimit !== undefined && Number(currentUsage) > Number(newLimit)) {
          hasOverQuota = true;
          overQuotaItems.push({
            quotaKey,
            current: currentUsage,
            newLimit: Number(newLimit),
            excess: Number(currentUsage) - Number(newLimit),
          });
        }
      }

      if (hasOverQuota) {
        const graceUntil = dayjs().add(15, "day").toDate();
        subscription.overQuotaItems = overQuotaItems.map((item) => ({
          quotaTypeCode: item.quotaKey,
          current: item.current,
          newLimit: item.newLimit,
          status: "grace_period",
          graceUntil,
          notifiedAt: new Date(),
        }));
        subscription.downgradeBlocked = true;
        subscription.downgradeBlockReason = `Cannot downgrade: ${overQuotaItems.map((i) => `${i.quotaKey}: ${i.current} used, limit ${i.newLimit}`).join("; ")}`;

        createSubscriptionEvent(
          subscription,
          "downgrade_blocked",
          `Downgrade blocked due to over-quota: ${subscription.downgradeBlockReason}`,
          { overQuotaItems, graceUntil },
          req.user?._id
        );

        await subscription.save();

        return res.status(409).json({
          success: false,
          message: subscription.downgradeBlockReason,
          data: {
            overQuotaItems: subscription.overQuotaItems,
            graceUntil,
            options: [
              "Delete excess products to reach the new limit",
              "Keep your current plan",
              "Upgrade to a higher plan",
            ],
          },
        });
      }
    }

    const previousPlanId = subscription.planId;
    const effectiveBillingCycle = billingCycle || subscription.billingCycle || "monthly";
    const effectiveStart = startDate ? new Date(startDate) : new Date();
    const effectiveStatus = Number(trialDays) > 0
      ? getSubscriptionStatusForAssignment({ trialDays })
      : subscription.status === "trial"
      ? "trial"
      : "active";
    const trialEndsAt = Number(trialDays) > 0 ? dayjs(effectiveStart).add(trialDays, "day").toDate() : undefined;
    const currentPeriodEnd = effectiveBillingCycle === "yearly"
      ? dayjs(effectiveStart).add(1, "year").toDate()
      : dayjs(effectiveStart).add(1, "month").toDate();

    subscription.planId = targetPlan._id;
    subscription.currentPlanName = targetPlan.name;
    subscription.startedAt = effectiveStart;
    subscription.currentPeriodStart = effectiveStart;
    subscription.status = effectiveStatus;
    subscription.billingCycle = effectiveBillingCycle;
    subscription.priceSnapshot = {
      monthly: targetPlan.pricing?.monthly,
      yearly: targetPlan.pricing?.yearly,
      currency: targetPlan.pricing?.currency,
      taxIncluded: targetPlan.pricing?.taxIncluded,
    };
     subscription.currency = targetPlan.pricing?.currency || "USD";
     subscription.basePriceInCurrency = targetPlan.pricing?.monthly;
     subscription.currentPlan = {
       planId: targetPlan._id,
       effectiveFrom: effectiveStart,
     };
     subscription.billingCycleDay = new Date(effectiveStart).getDate();
     subscription.trialPeriod = Number(trialDays) > 0;
    subscription.trialEndsAt = trialEndsAt;
    subscription.trialStartDate = Number(trialDays) > 0 ? effectiveStart : subscription.trialStartDate;
    subscription.trialEndDate = Number(trialDays) > 0 ? trialEndsAt : subscription.trialEndDate;
    subscription.currentPeriodEnd = currentPeriodEnd;
    subscription.nextBillingDate = currentPeriodEnd;
    subscription.isAutoRenew = isAutoRenew;
    subscription.updatedBy = req.user?._id;

    createSubscriptionEvent(
      subscription,
      action,
      `Subscription ${action}`,
      {
        previousPlanId,
        targetPlanId,
        billingCycle: effectiveBillingCycle,
        trialDays,
      },
      req.user?._id
    );

    // NOUVEAU: Create SubscriptionHistory record for plan changes
    if (action === "upgraded" || action === "downgraded" || action === "migrated" || action === "assigned") {
      await SubscriptionHistory.create({
        storeId: subscription.storeId,
        subscriptionId: subscription._id,
        oldPlanId: previousPlanId || null,
        newPlanId: targetPlanId,
        action: action.replace("graded", "grade"), // upgradedéupgrade, downgradedédowngrade
        performedBy: req.user?._id,
        reason: req.body?.reason || `Plan ${action.replace("graded", "grade")}`,
        metadata: {
          billingCycle: effectiveBillingCycle,
          trialDays,
          strategy: req.body?.strategy || null,
        },
      });
    }

    await subscription.save();

    store.planId = targetPlan._id;
    store.planName = targetPlan.name;
    store.billingCycle = effectiveBillingCycle;
    store.subscriptionStatus = subscription.status;
    store.currentSubscriptionId = subscription._id;
    store.trialEndsAt = trialEndsAt;
    store.currentPeriodEnd = currentPeriodEnd;
    store.nextBillingDate = currentPeriodEnd;
    await store.save();

    res.status(200).json({
      success: true,
      message: `Subscription ${action} successfully`,
      data: subscription,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const upgradeSubscription = async (req, res) => changeSubscriptionPlan(req, res, "upgraded");
const downgradeSubscription = async (req, res) => changeSubscriptionPlan(req, res, "downgraded");

const suspendSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    if (subscription.status === "suspended") {
      return res.status(400).json({ success: false, message: "Subscription is already suspended" });
    }

    subscription.status = "suspended";
    subscription.isAutoRenew = false;
    subscription.updatedBy = req.user?._id;
    createSubscriptionEvent(subscription, "suspended", "Subscription suspended", {}, req.user?._id);
    await subscription.save();

    const store = await Store.findById(subscription.storeId);
    if (store && store.currentSubscriptionId?.toString() === id) {
      store.subscriptionStatus = "suspended";
      await store.save();
    }

    res.status(200).json({ success: true, message: "Subscription suspended successfully", data: subscription });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// P18  createAuditLog enrichi (before/after, IP, userAgent, severity, version, metadata)
// Signature rétrocompatible : (planId, action, fieldChanges, userId, summary, relatedEntity, sourcePlanId)
// Options complémentaires (dernier arg peut être un objet) : { before, after, severity, version, metadata, req, status }
const createAuditLog = async (planId, action, fieldChanges, userId, summary, relatedEntity, sourcePlanId = null, options = {}) => {
  // Si sourcePlanId est un objet d'options (appel avec options en 7e position)
  if (sourcePlanId && typeof sourcePlanId === "object" && !(sourcePlanId instanceof mongoose.Types.ObjectId)) {
    options = sourcePlanId;
    sourcePlanId = null;
  }

  const req = options.req;
  const ipAddress = options.ipAddress || (req ? req.headers["x-forwarded-for"] || req.ip : null);
  const userAgent = req ? req.headers["user-agent"] : null;

  await PlanAuditLog.create({
    planId,
    action,
    fieldChanges,
    before: options.before || null,
    after: options.after || null,
    userId,
    ipAddress,
    userAgent: userAgent || null,
    severity: options.severity || "low",
    status: options.status || "success",
    entityType: options.entityType || "plan",
    version: options.version || null,
    metadata: options.metadata || null,
    summary,
    relatedEntity: relatedEntity || null,
    sourcePlanId,
  });
};

// Get all plans with pagination, search, filters, and sorting
const parseSortValue = (sortValue) => {
  if (typeof sortValue === "object" && sortValue !== null) {
    return sortValue;
  }

  if (typeof sortValue !== "string") {
    return { createdAt: -1 };
  }

  if (sortValue.startsWith("-")) {
    return { [sortValue.slice(1)]: -1 };
  }

  if (sortValue.startsWith("+")) {
    return { [sortValue.slice(1)]: 1 };
  }

  const [field, direction] = sortValue.split(/[_-]/);
  if (direction === "asc") {
    return { [field]: 1 };
  }
  if (direction === "desc") {
    return { [field]: -1 };
  }

  return { [sortValue]: 1 };
};

const getAllPlans = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      sort = "-createdAt",
    } = req.query;

    const skip = (page - 1) * limit;
    const queryObject = {};

    // Search by name or description
    if (search) {
      queryObject.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status) {
      queryObject.status = status;
    }

    // Count total documents before pagination
    const total = await Plan.countDocuments(queryObject);

    const sortObject = parseSortValue(sort);

    // Fetch plans with pagination, sorting, and storesCount
    const plans = await Plan.aggregate([
      { $match: queryObject },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "planId",
          as: "_subscriptionsCount",
        },
      },
      {
        $addFields: {
          storesCount: { $size: "$_subscriptionsCount" },
        },
      },
      {
        $project: {
          _subscriptionsCount: 0,
        },
      },
      { $sort: sortObject },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    res.status(200).json({
      success: true,
      data: plans,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get active plans only
const getActivePlans = async (req, res) => {
  try {
    let plans = await Plan.find({ status: "active" })
      .populate("createdBy", "name email")
      .sort({ displayOrder: 1, createdAt: -1 });

    if (!plans.length) {
      const defaultPlan = await Plan.findOneAndUpdate(
        { slug: "starter", status: "active" },
        {
          name: "Starter",
          slug: "starter",
          description: "Default plan for new stores",
          status: "active",
          visibility: "public",
          isDefault: true,
          displayOrder: 0,
          pricing: {
            monthly: 0,
            yearly: 0,
            currency: "USD",
            trialDays: 0,
          },
          features: {
            users: true,
            products: true,
            orders: true,
            reports: false,
            api: false,
          },
          limits: {
            maxUsers: 1,
            maxProducts: 50,
            maxOrders: 100,
            storage: "1GB",
          },
        },
        { new: true, upsert: true }
      );
      plans = [defaultPlan];
    }

    res.status(200).json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get plan by ID
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === "subscriptions" || id === "usage" || id === "active" || id === "active/list") {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const plan = await Plan.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    }

    const storesCount = await Subscription.countDocuments({ planId: plan._id });
    const subscriptionsSummary = await Subscription.aggregate([
      { $match: { planId: plan._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
        },
      },
    ]);

    const planObj = plan.toObject({ flattenMaps: true });
    planObj.storesCount = storesCount;
    planObj.subscriptionsSummary = subscriptionsSummary;

    res.status(200).json({ success: true, data: planObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create a new plan
const createPlan = async (req, res) => {
  try {
const { name, slug, description, badge, color, icon, pricing, features, limits, status, notes, trialDays, requirePaymentMethodForTrial, visibility } = req.body;

    // Validation
    if (!name || !slug) {
      return res
        .status(400)
        .json({ success: false, message: "Name and slug are required" });
    }

    // Check if slug is unique
    const existingSlug = await Plan.findOne({ slug: slug.toLowerCase() });
    if (existingSlug) {
      return res
        .status(400)
        .json({ success: false, message: "Slug already exists" });
    }

    // Check if name is unique
    const existingName = await Plan.findOne({ name });
    if (existingName) {
      return res
        .status(400)
        .json({ success: false, message: "Plan name already exists" });
    }

    // Validate pricing
    if (!pricing || pricing.monthly === undefined || pricing.yearly === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Pricing information is required" });
    }

    const normalizedFeatures = normalizePlanFeatures(features || {});
    const normalizedQuotas = normalizePlanQuotas(limits || {});

    // Create new plan
    const newPlan = new Plan({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      description,
      badge,
      color,
      icon,
      pricing,
      features: new Map(Object.entries(toLegacyFeatureMap(normalizedFeatures))),
      limits: new Map(Object.entries(toLegacyLimitsMap(normalizedQuotas))),
status: status || "draft",
      visibility: visibility || "public",
      notes,
      createdBy: req.user?._id,
      version: 1,
      trialDays: trialDays || 0,
      requirePaymentMethodForTrial: requirePaymentMethodForTrial || false,
       pricingHistory: [
         {
           version: 1,
           monthly: pricing.monthly,
           yearly: pricing.yearly,
           currency: pricing.currency || "USD",
           taxIncluded: pricing.taxIncluded || false,
           trialDays: pricing.trialDays || 0,
           effectiveFrom: pricing.effectiveFrom || new Date(),
           changeDescription: "Initial version",
           versionNote: versionNote || "",
           createdBy: req.user?._id,
           createdAt: new Date(),
         },
       ],
    });

    await newPlan.save();

    if (normalizedFeatures.length > 0) {
      const planFeatures = normalizedFeatures.map((feature) => ({
        planId: newPlan._id,
        code: feature.code,
        enabled: feature.enabled,
        limit: feature.limit,
      }));
      await PlanFeature.insertMany(planFeatures);
    }

    if (normalizedQuotas.length > 0) {
      const planQuotas = normalizedQuotas.map((quota) => ({
        planId: newPlan._id,
        quotaTypeCode: quota.quotaTypeCode,
        limitValue: quota.limitValue,
        isUnlimited: quota.isUnlimited,
      }));
      await PlanQuota.insertMany(planQuotas);
    }

    await createAuditLog(newPlan._id, "create", null, req.user?._id, `Plan ${name} created`, "general");

    const populatedPlan = await Plan.findById(newPlan._id)
      .populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      data: populatedPlan,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a plan
const updatePlan = async (req, res) => {
  try {
    const blocked = PlanCatalogService.FORBIDDEN_ON_UPDATE.filter((f) => req.body?.[f] !== undefined);
    if (blocked.length > 0) {
      return res.status(400).json({
        success: false,
        code: "PLAN_FIELD_NOT_EDITABLE",
        message: `Ces champs ne sont plus modifiables sur le Plan : ${blocked.join(", ")}. Le tarif passe par PlanPrice, les features et quotas par PlanVersion.`,
      });
    }
    const { id } = req.params;
const {
       name,
       slug,
       description,
       badge,
       color,
       icon,
       pricing,
       features,
       limits,
       status,
       visibility,
       notes,
       scheduledDeactivationAt,
       strategy,
       versionNote,
       changeDescription,
     } = req.body;

    let plan = await Plan.findById(id);
    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    }

    if (req.body.version && req.body.version !== plan.version) {
      return res
        .status(409)
        .json({ success: false, message: "Version conflict: plan has been modified by another user" });
    }

    // Check if slug is unique (excluding current plan)
    if (slug && slug.toLowerCase() !== plan.slug) {
      const existingSlug = await Plan.findOne({
        slug: slug.toLowerCase(),
        _id: { $ne: id },
      });
      if (existingSlug) {
        return res
          .status(400)
          .json({ success: false, message: "Slug already exists" });
      }
    }

    // Check if name is unique (excluding current plan)
    if (name && name !== plan.name) {
      const existingName = await Plan.findOne({
        name,
        _id: { $ne: id },
      });
      if (existingName) {
        return res
          .status(400)
          .json({ success: false, message: "Plan name already exists" });
      }
    }

const oldPricing = plan.pricing;
    const oldFeatures = Object.fromEntries(plan.features || []);
    const oldLimits = Object.fromEntries(plan.limits || []);
    const oldStatus = plan.status;
    const oldName = plan.name;
    const oldSlug = plan.slug;
    const oldVisibility = plan.visibility;
    const normalizedIncomingFeatures = normalizePlanFeatures(features || oldFeatures);
    const normalizedIncomingQuotas = normalizePlanQuotas(limits || oldLimits);

    const pricingChanged = pricing && JSON.stringify(pricing) !== JSON.stringify(oldPricing);
    const featuresChanged = features && JSON.stringify(normalizedIncomingFeatures) !== JSON.stringify(normalizePlanFeatures(oldFeatures));
    const limitsChanged = limits && JSON.stringify(limits) !== JSON.stringify(oldLimits);
    const statusChanged = status && status !== oldStatus;

    const fieldChanges = {};
    if (pricingChanged) fieldChanges.pricing = { old: oldPricing, new: pricing };
    if (featuresChanged) fieldChanges.features = { old: oldFeatures, new: features };
    if (limitsChanged) fieldChanges.limits = { old: oldLimits, new: limits };
    if (statusChanged) fieldChanges.status = { old: oldStatus, new: status };
    if (name && name !== plan.name) fieldChanges.name = { old: plan.name, new: name };
    if (description !== undefined && description !== plan.description) fieldChanges.description = { old: plan.description, new: description };
    if (badge !== undefined && badge !== plan.badge) fieldChanges.badge = { old: plan.badge, new: badge };
    if (color && color !== plan.color) fieldChanges.color = { old: plan.color, new: color };
    if (icon !== undefined && icon !== plan.icon) fieldChanges.icon = { old: plan.icon, new: icon };
    if (notes !== undefined && notes !== plan.notes) fieldChanges.notes = { old: plan.notes, new: notes };
    if (scheduledDeactivationAt !== undefined && scheduledDeactivationAt !== plan.scheduledDeactivationAt) fieldChanges.scheduledDeactivationAt = { old: plan.scheduledDeactivationAt, new: scheduledDeactivationAt };
    if (visibility !== undefined && visibility !== plan.visibility) fieldChanges.visibility = { old: plan.visibility, new: visibility };

    // Update fields
    plan.name = name || plan.name;
    plan.slug = slug ? slugify(slug.toLowerCase()) : plan.slug;
    plan.description = description !== undefined ? description : plan.description;
    plan.badge = badge !== undefined ? badge : plan.badge;
    plan.color = color || plan.color;
    plan.icon = icon !== undefined ? icon : plan.icon;
    plan.pricing = pricing || plan.pricing;
    plan.features = features ? new Map(Object.entries(toLegacyFeatureMap(normalizedIncomingFeatures))) : plan.features;
    plan.limits = limits ? new Map(Object.entries(toLegacyLimitsMap(normalizedIncomingQuotas))) : plan.limits;
    plan.status = status || plan.status;
    plan.visibility = visibility !== undefined ? visibility : plan.visibility;
    plan.notes = notes !== undefined ? notes : plan.notes;
    if (scheduledDeactivationAt !== undefined) {
      plan.scheduledDeactivationAt = scheduledDeactivationAt;
    }

    if (Object.keys(fieldChanges).length > 0) {
      plan.version = (plan.version || 1) + 1;
    }

    plan.updatedBy = req.user?._id;

    await plan.save();

    if (features !== undefined) {
      const existingPlanFeatures = await PlanFeature.find({ planId: plan._id });
      const existingByCode = new Map(existingPlanFeatures.map((entry) => [entry.code, entry]));

      await Promise.all(
        normalizedIncomingFeatures.map(async (feature) => {
          const existing = existingByCode.get(feature.code);
          if (existing) {
            existing.enabled = feature.enabled;
            existing.limit = feature.limit ?? null;
            await existing.save();
          } else {
            await PlanFeature.create({
              planId: plan._id,
              code: feature.code,
              enabled: feature.enabled,
              limit: feature.limit ?? null,
            });
          }
        })
      );

      // NOUVEAU: Gestion du cycle de vie des features (Retention vs Disabling)
      const incomingCodes = new Set(normalizedIncomingFeatures.map((feature) => feature.code));
      const staleCodes = existingPlanFeatures
        .map((entry) => entry.code)
        .filter((code) => !incomingCodes.has(code));

      if (staleCodes.length > 0) {
        // Au lieu de supprimer immédiatement, marquer comme "deprecated" avec grace period
        const gracePeriodDays = 30; // 30 jours de grace period par défaut
        const graceUntil = dayjs().add(gracePeriodDays, "day").toDate();
        
        await PlanFeature.updateMany(
          { 
            planId: plan._id, 
            code: { $in: staleCodes },
            status: { $ne: "deprecated" } // Ne pas re-déprécier une feature déjà déprécié
          },
          {
            $set: {
              status: "deprecated",
              deprecatedAt: new Date(),
              graceUntil: graceUntil,
              actionOnRemoval: "keep_for_existing", // Garder pour les existing subscriptions
              enabled: false, // Mais disabled pour les nouvelles subscriptions
            }
          }
        );
        
        console.log(`Marked ${staleCodes.length} features as deprecated for plan ${plan._id}: ${staleCodes.join(', ')}`);
      }
    }

    if (limits !== undefined) {
      const existingPlanQuotas = await PlanQuota.find({ planId: plan._id });
      const existingByCode = new Map(existingPlanQuotas.map((entry) => [entry.quotaTypeCode, entry]));

      await Promise.all(
        normalizedIncomingQuotas.map(async (quota) => {
          const existing = existingByCode.get(quota.quotaTypeCode);
          if (existing) {
            existing.limitValue = quota.limitValue;
            existing.isUnlimited = quota.isUnlimited;
            await existing.save();
          } else {
            await PlanQuota.create({
              planId: plan._id,
              quotaTypeCode: quota.quotaTypeCode,
              limitValue: quota.limitValue,
              isUnlimited: quota.isUnlimited,
            });
          }
        })
      );

      const incomingCodes = new Set(normalizedIncomingQuotas.map((quota) => quota.quotaTypeCode));
      const staleCodes = existingPlanQuotas
        .map((entry) => entry.quotaTypeCode)
        .filter((code) => !incomingCodes.has(code));

      if (staleCodes.length > 0) {
        await PlanQuota.deleteMany({ planId: plan._id, quotaTypeCode: { $in: staleCodes } });
      }
    }

    if (pricingChanged) {
      // Close the current pricing entry
      const currentPricingEntry = plan.pricingHistory?.length
        ? plan.pricingHistory[plan.pricingHistory.length - 1]
        : null;
      if (currentPricingEntry && !currentPricingEntry.effectiveTo) {
        currentPricingEntry.effectiveTo = new Date();
        await plan.save();
      }

      // Add new pricing history entry
      const newVersion = (plan.version || 1) + 1;
       const newPricingEntry = {
         version: newVersion,
         monthly: pricing.monthly,
         yearly: pricing.yearly,
         currency: pricing.currency || "USD",
         taxIncluded: pricing.taxIncluded || false,
         trialDays: pricing.trialDays || 0,
         effectiveFrom: pricing.effectiveFrom || new Date(),
         changeDescription: `Price updated from ${oldPricing?.monthly} to ${pricing.monthly} monthly`,
         versionNote: versionNote || "",
         createdBy: req.user?._id,
         createdAt: new Date(),
       };

      plan.pricingHistory = plan.pricingHistory || [];
      plan.pricingHistory.push(newPricingEntry);
      plan.version = newVersion;

       await PlanPriceHistory.create({
         planId: plan._id,
         oldMonthlyPrice: oldPricing?.monthly,
         newMonthlyPrice: pricing?.monthly,
         oldYearlyPrice: oldPricing?.yearly,
         newYearlyPrice: pricing?.yearly,
         version: newVersion,
         strategy: strategy || "new_subscribers_only",
         changeDescription: changeDescription || "Pricing update",
         versionNote: versionNote || "",
         changedBy: req.user?._id,
       });
    }

    if (Object.keys(fieldChanges).length > 0 && !pricingChanged) {
      plan.version = (plan.version || 1) + 1;
    }

    if (limitsChanged) {
      const newLimits = limits || {};
      const reducedQuotas = Object.keys(newLimits).filter(
        (key) =>
          oldLimits[key] !== undefined &&
          oldLimits[key] !== null &&
          newLimits[key] !== null &&
          newLimits[key] < oldLimits[key]
      );
      if (reducedQuotas.length > 0) {
        const subscriptions = await Subscription.find({
          planId: plan._id,
          status: { $in: ["active", "trial"] },
        }).populate("storeId", "name");

        const storeIds = subscriptions
          .map((sub) => sub.storeId?._id)
          .filter(Boolean);

        const storeUsageDocs = await StoreUsage.find({ storeId: { $in: storeIds } })
          .populate("quotaTypeId", "code");

        const usageByStore = buildUsageMapByStore(storeUsageDocs);

        const affectedStores = subscriptions
          .map((sub) => {
            const exceededQuotas = reducedQuotas.filter((key) => {
              const limit = newLimits[key];
              const current = usageByStore.get(String(sub.storeId?._id))?.[key] || 0;
              return (
                limit !== undefined &&
                limit !== null &&
                Number(current) > Number(limit)
              );
            });
            if (exceededQuotas.length > 0) {
              return {
                storeId: sub.storeId?._id,
                storeName: sub.storeId?.name,
                exceededQuotas,
              };
            }
            return null;
          })
          .filter(Boolean);

        if (affectedStores.length > 0) {
          fieldChanges.affectedStores = affectedStores;
        }
      }
    }

// P18  Enrichir l'audit log avec before/after, IP, userAgent, severity, version
    await createAuditLog(
      plan._id,
      "update",
      fieldChanges,
      req.user?._id,
      `Plan ${plan.name} updated`,
      "general",
      null,
      {
req,
        before: {
          name: oldName,
          slug: oldSlug,
          pricing: oldPricing,
          features: oldFeatures,
          limits: oldLimits,
          status: oldStatus,
          visibility: oldVisibility,
        },
        after: {
          name: plan.name,
          slug: plan.slug,
          pricing: plan.pricing,
          features: Object.fromEntries(plan.features || []),
          limits: Object.fromEntries(plan.limits || []),
          status: plan.status,
          visibility: plan.visibility,
        },
        severity: Object.keys(fieldChanges).length > 0 ? "medium" : "low",
        version: plan.version,
        metadata: { changedFields: Object.keys(fieldChanges) },
      }
    );

    // P13  Persist a full immutable snapshot for versioning / rollback
    try {
      await PlanVersionService.createSnapshot(plan, {
        version: plan.version,
        versionNote,
        changeDescription: changeDescription || `Plan ${plan.name} updated`,
        source: "update",
        createdBy: req.user?._id,
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
        changesSummary: fieldChanges,
      });
    } catch (snapshotErr) {
      console.error("[planController] Failed to create plan version snapshot:", snapshotErr.message);
    }

    const updatedPlan = await Plan.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Plan updated successfully",
      data: updatedPlan,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Clone a plan
const clonePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;

    const originalPlan = await Plan.findById(id);
    if (!originalPlan) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    }

    const cloneName = name?.trim() || `${originalPlan.name} (Copy)`;
    const requestedSlug = slug?.trim()
      ? slugify(slug.toLowerCase())
      : originalPlan.slug;

    let baseSlug = requestedSlug;
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await Plan.findOne({ slug: uniqueSlug });
      if (!existing) break;
      counter++;
      uniqueSlug = `${baseSlug}-copy${counter > 1 ? `-${counter}` : ""}`;
    }

    const clonedPlan = new Plan({
      name: cloneName,
      slug: uniqueSlug,
      description: originalPlan.description,
      badge: originalPlan.badge,
      color: originalPlan.color,
      icon: originalPlan.icon,
      pricing: originalPlan.pricing,
      features: new Map(originalPlan.features),
      limits: new Map(originalPlan.limits),
      status: "draft",
      notes: originalPlan.notes,
      createdBy: req.user?._id,
    });

    await clonedPlan.save();

    const originalPlanFeatures = await PlanFeature.find({ planId: originalPlan._id });
    if (originalPlanFeatures.length > 0) {
      await PlanFeature.insertMany(
        originalPlanFeatures.map((feature) => ({
          planId: clonedPlan._id,
          code: feature.code,
          enabled: feature.enabled,
          limit: feature.limit ?? null,
        }))
      );
    }

    await createAuditLog(
      clonedPlan._id,
      "clone",
      { name: cloneName, slug: uniqueSlug },
      req.user?._id,
      `Plan ${originalPlan.name} cloned as ${clonedPlan.name}`,
      "general",
      originalPlan._id
    );

    const populatedPlan = await Plan.findById(clonedPlan._id)
      .populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Plan cloned successfully",
      data: populatedPlan,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update plan status
const updatePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["draft", "active", "inactive", "archived"].includes(status)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid status. Must be draft, active, inactive, or archived",
        });
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    }

    const oldStatus = plan.status;
    plan.status = status;
    plan.updatedBy = req.user?._id;
    await plan.save();

    await createAuditLog(
      plan._id,
      "update",
      { status: { old: oldStatus, new: status } },
      req.user?._id,
      `Plan ${plan.name} status updated to ${status}`,
      "general"
    );

    const updatedPlan = await Plan.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: `Plan status updated to ${status}`,
      data: updatedPlan,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const activatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    if (!plan.pricing?.monthly) {
      return res.status(400).json({ success: false, message: "Monthly price must be defined before activation" });
    }

    const planFeatures = await PlanFeature.find({ planId: plan._id, enabled: true });
    const hasActiveFeature = (plan.features && Array.from(plan.features.values()).some((v) => v === true)) || planFeatures.length > 0;
    if (!hasActiveFeature) {
      return res.status(400).json({ success: false, message: "At least one feature must be active before activation" });
    }

    const oldStatus = plan.status;
    plan.status = "active";
    plan.updatedBy = req.user?._id;
    await plan.save();

    await createAuditLog(
      plan._id,
      "activate",
      { status: { old: oldStatus, new: "active" } },
      req.user?._id,
      `Plan ${plan.name} activated`,
      "general"
    );

    res.status(200).json({ success: true, message: "Plan activated successfully", data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deactivatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDeactivationAt } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const oldStatus = plan.status;
    const fieldChanges = { status: { old: oldStatus, new: "inactive" } };

    if (scheduledDeactivationAt) {
      fieldChanges.scheduledDeactivationAt = {
        old: plan.scheduledDeactivationAt,
        new: scheduledDeactivationAt,
      };
      plan.scheduledDeactivationAt = scheduledDeactivationAt;
    }

    plan.status = "inactive";
    plan.updatedBy = req.user?._id;
    await plan.save();

    await createAuditLog(
      plan._id,
      "deactivate",
      fieldChanges,
      req.user?._id,
      scheduledDeactivationAt
        ? `Plan ${plan.name} scheduled for deactivation`
        : `Plan ${plan.name} deactivated`,
      "general"
    );

    res.status(200).json({ success: true, message: "Plan deactivated successfully", data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const archivePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    plan.status = "archived";
    plan.updatedBy = req.user?._id;
    await plan.save();

    await createAuditLog(
      plan._id,
      "archive",
      { status: { old: plan.status, new: "archived" } },
      req.user?._id,
      `Plan ${plan.name} archived`,
      "general"
    );

    res.status(200).json({ success: true, message: "Plan archived successfully", data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "", search = "", sort = "-createdAt" } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [{ "storeId.name": { $regex: search, $options: "i" } }];
    }

    const total = await Subscription.countDocuments(query);
    const subscriptions = await Subscription.find(query)
      .populate("storeId", "name owner plan planName planSlug subscriptionStatus")
      .populate("planId", "name slug pricing")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: subscriptions,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPlanSubscriptions = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === "subscriptions" || id === "usage") {
      return res.status(400).json({ success: false, message: "Invalid plan identifier" });
    }

    const { page = 1, limit = 20, status = "", search = "", sort = "-createdAt" } = req.query;
    const skip = (page - 1) * limit;

    const query = { planId: id };
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { "storeId.name": { $regex: search, $options: "i" } },
      ];
    }

    const total = await Subscription.countDocuments(query);
    const subscriptions = await Subscription.find(query)
      .populate("storeId", "name owner plan planName planSlug subscriptionStatus")
      .populate("planId", "name slug pricing")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: subscriptions,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPlanSubscriptionsSummary = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === "subscriptions" || id === "usage") {
      return res.status(400).json({ success: false, message: "Invalid plan identifier" });
    }

    const total = await Subscription.countDocuments({ planId: id });
    const byStatus = await Subscription.aggregate([
      { $match: { planId: id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: { total, byStatus } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPlanAffectedStores = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const subscriptions = await Subscription.find({
      planId: id,
      status: { $in: ["active", "trial"] },
    }).populate("storeId", "name");

    const storeIds = subscriptions
      .map((sub) => sub.storeId?._id)
      .filter(Boolean);

    const storeUsageDocs = await StoreUsage.find({ storeId: { $in: storeIds } })
      .populate("quotaTypeId", "code");

    const usageByStore = buildUsageMapByStore(storeUsageDocs);

    const affectedStores = subscriptions
      .map((sub) => {
        const exceededQuotas = [];
        for (const [key, limit] of plan.limits || []) {
          const current = usageByStore.get(String(sub.storeId?._id))?.[key] || 0;
          if (limit !== undefined && limit !== null && current > limit) {
            exceededQuotas.push(key);
          }
        }
        if (exceededQuotas.length > 0) {
          return {
            storeId: sub.storeId?._id,
            storeName: sub.storeId?.name,
            exceededQuotas,
          };
        }
        return null;
      })
      .filter(Boolean);

    res.status(200).json({ success: true, data: affectedStores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPlanHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriptions = await Subscription.find({ planId: id })
      .populate("storeId", "name")
      .populate("planId", "name slug");

    const history = subscriptions
      .flatMap((subscription) =>
        (subscription.events || []).map((event) => ({
          store: subscription.storeId,
          plan: subscription.planId,
          subscriptionId: subscription._id,
          type: event.type,
          message: event.message,
          data: event.data,
          actor: event.actor,
          createdAt: event.createdAt,
        }))
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

 const assignPlanToStore = async (req, res) => {
   try {
     const { id } = req.params;
     const {
       storeId,
       billingCycle = "monthly",
       trialDays,
       startDate,
       isAutoRenew = true,
       currency,
       billingAddress,
       couponCode,
     } = req.body;

     const plan = await Plan.findById(id);
     if (!plan) {
       return res.status(404).json({ success: false, message: "Plan not found" });
     }

     const store = await Store.findById(storeId);
     if (!store) {
       return res.status(404).json({ success: false, message: "Store not found" });
     }

     const activeSubscription = await Subscription.findOne({
       storeId,
       status: { $in: ["active", "trial", "past_due"] },
     }).sort({ createdAt: -1 });

     const status = getSubscriptionStatusForAssignment({ trialDays });

     // Multi-currency: determine the effective currency and price
     const effectiveCurrency = currency || plan.pricing?.currency || "USD";
     const effectiveMonthly = plan.pricing?.monthly || 0;
     const effectiveYearly = plan.pricing?.yearly || 0;

     const priceSnapshot = {
       monthly: effectiveMonthly,
       yearly: effectiveYearly,
       currency: effectiveCurrency,
       taxIncluded: plan.pricing?.taxIncluded,
     };

     const effectiveStart = startDate ? new Date(startDate) : new Date();
     const trialEndsAt = trialDays ? dayjs(effectiveStart).add(trialDays, "day").toDate() : undefined;
     const currentPeriodEnd = billingCycle === "yearly"
       ? dayjs(effectiveStart).add(1, "year").toDate()
       : dayjs(effectiveStart).add(1, "month").toDate();

     let subscription = null;

     const activeSubscriptions = await Subscription.find({
       storeId,
       status: { $in: ["active", "trial", "past_due"] },
     });

     for (const activeSub of activeSubscriptions) {
       const isSamePlan = activeSub.planId?.toString() === id;
       if (!isSamePlan) {
         activeSub.status = "canceled";
         createSubscriptionEvent(
           activeSub,
           "canceled",
           "Previous subscription canceled to assign a new plan",
           { previousPlanId: activeSub.planId, newPlanId: id },
           req.user?._id
         );
         await activeSub.save();
       }
     }

     const samePlanSubscription = activeSubscriptions.find(
       (sub) => sub.planId?.toString() === id
     );

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
         pricing: {
           monthly: plan.pricing?.monthly,
           yearly: plan.pricing?.yearly,
           currency: plan.pricing?.currency,
           taxIncluded: plan.pricing?.taxIncluded,
           trialDays: plan.pricing?.trialDays,
         },
         features: plan.features,
         limits: plan.limits,
         featureRefs: plan.featureRefs,
       };
       subscription.status = status;
       subscription.billingCycle = billingCycle;
       subscription.priceSnapshot = priceSnapshot;
        subscription.currency = effectiveCurrency;
        subscription.basePriceInCurrency = effectiveMonthly;
        subscription.currentPlan = {
          planId: plan._id,
          effectiveFrom: effectiveStart,
        };
        subscription.billingCycleDay = new Date(effectiveStart).getDate();
        subscription.trialEndsAt = trialEndsAt;
       subscription.currentPeriodEnd = currentPeriodEnd;
       subscription.nextBillingDate = currentPeriodEnd;
       subscription.isAutoRenew = isAutoRenew;
       subscription.billingAddress = billingAddress || subscription.billingAddress;
       subscription.updatedBy = req.user?._id;

       const eventType = previousStatus === status ? "activated" : "updated";
       createSubscriptionEvent(
         subscription,
         eventType,
         `Subscription ${eventType}`,
         { previousStatus, billingCycle, trialDays },
         req.user?._id
       );
     } else {
       subscription = new Subscription({
         storeId,
         planId: id,
         planVersion: plan.version || 1,
         planSnapshot: {
           name: plan.name,
           slug: plan.slug,
           description: plan.description,
           badge: plan.badge,
           color: plan.color,
           icon: plan.icon,
           pricing: {
             monthly: plan.pricing?.monthly,
             yearly: plan.pricing?.yearly,
             currency: plan.pricing?.currency,
             taxIncluded: plan.pricing?.taxIncluded,
             trialDays: plan.pricing?.trialDays,
           },
           features: plan.features,
           limits: plan.limits,
           featureRefs: plan.featureRefs,
         },
         currentPlanName: plan.name,
         startedAt: effectiveStart,
         currentPeriodStart: effectiveStart,
         status,
         billingCycle,
          priceSnapshot,
          currency: effectiveCurrency,
          basePriceInCurrency: effectiveMonthly,
          currentPlan: {
            planId: plan._id,
            effectiveFrom: effectiveStart,
          },
          billingCycleDay: new Date(effectiveStart).getDate(),
          trialPeriod: trialDays > 0,
         trialEndsAt,
         trialStartDate: trialDays > 0 ? effectiveStart : undefined,
         trialEndDate: trialDays > 0 ? trialEndsAt : undefined,
         currentPeriodEnd,
         nextBillingDate: currentPeriodEnd,
         isAutoRenew,
         billingAddress: billingAddress || {},
         createdBy: req.user?._id,
         updatedBy: req.user?._id,
       });
       createSubscriptionEvent(subscription, "created", "Subscription created", { billingCycle, trialDays }, req.user?._id);
     }

     await subscription.save();

     // Apply coupon if provided
     let appliedCoupon = null;
     let discountAmount = 0;
     let couponRedemptionId = null;
     if (couponCode) {
       const platformCouponApplicationService = require("../service/platformCouponApplicationService");
       try {
         const applied = await platformCouponApplicationService.apply({
           code: couponCode,
           subscriptionId: subscription._id,
           actorId: req.user?._id || null,
         });
         discountAmount = applied.discountAmount;
         couponRedemptionId = applied.redemption._id;
         appliedCoupon = {
           couponId: applied.coupon._id,
           code: applied.coupon.code,
           discountType: applied.coupon.discountType,
           discountAmount,
           appliedAt: new Date(),
         };
       } catch (couponError) {
         if (couponError.name === "CouponApplicationError") {
           return res.status(couponError.status).json({
             success: false,
             code: couponError.code,
             message: couponError.message,
           });
         }
         throw couponError;
       }
     }

     // Generate invoice
     const Invoice = require("../models/Invoice");
     const Payment = require("../models/Payment");
     const invoiceSubtotal = Math.max(effectiveMonthly - discountAmount, 0);
     const taxRate = 0; // Default: no tax; can be overridden by billing address lookup
     const taxAmount = Math.round(invoiceSubtotal * taxRate * 100) / 100;
     const invoiceTotal = invoiceSubtotal + taxAmount;

     const invoice = await Invoice.create({
       invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
       storeId,
       subscriptionId: subscription._id,
       planId: plan._id,
       items: [
         {
           description: `${plan.name} - ${billingCycle}`,
           quantity: 1,
           unitPrice: effectiveMonthly,
           total: effectiveMonthly,
         },
       ],
       baseAmount: effectiveMonthly,
       discounts: appliedCoupon
         ? [
             {
               couponId: appliedCoupon.couponId,
               code: appliedCoupon.code,
               discountType: appliedCoupon.discountType,
               discountAmount: appliedCoupon.discountAmount,
               appliedAt: appliedCoupon.appliedAt,
             },
           ]
         : [],
       subtotal: invoiceSubtotal,
       taxRate,
       tax: taxAmount,
       total: invoiceTotal,
       currency: effectiveCurrency,
       status: "draft",
       dueDate: currentPeriodEnd,
       issuedAt: new Date(),
     });

     if (couponRedemptionId) {
       const PlatformCouponRedemption = require("../models/PlatformCouponRedemption");
       await PlatformCouponRedemption.updateOne(
         { _id: couponRedemptionId },
         { invoiceId: invoice._id }
       );
     }

      store.planId = plan._id;
     store.planName = plan.name;
     store.billingCycle = billingCycle;
    store.subscriptionStatus = subscription.status;
    store.currentSubscriptionId = subscription._id;
    store.trialEndsAt = trialEndsAt;
    store.currentPeriodEnd = currentPeriodEnd;
    store.nextBillingDate = currentPeriodEnd;
    await store.save();

    res.status(200).json({ success: true, message: "Plan assigned to store successfully", data: subscription });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Downgrade a store's subscription to a lower plan
const downgradePlanSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId, billingCycle = "monthly", startDate } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const activeSubscription = await Subscription.findOne({
      storeId,
      status: { $in: ["active", "trial", "past_due"] },
    }).sort({ createdAt: -1 });

    if (!activeSubscription) {
      return res.status(404).json({ success: false, message: "No active subscription found for this store" });
    }

    if (activeSubscription.planId?.toString() === id) {
      return res.status(400).json({ success: false, message: "Store is already on this plan" });
    }

    const currentPlan = await Plan.findById(activeSubscription.planId);
    const previousPlanId = activeSubscription.planId;
    const currentMonthly = currentPlan?.pricing?.monthly || 0;
    const newMonthly = plan.pricing?.monthly || 0;

    if (newMonthly >= currentMonthly) {
      return res.status(400).json({ success: false, message: "New plan price must be lower than current plan for a downgrade" });
    }

    const effectiveStart = startDate ? new Date(startDate) : new Date();
    const currentPeriodEnd = billingCycle === "yearly"
      ? dayjs(effectiveStart).add(1, "year").toDate()
      : dayjs(effectiveStart).add(1, "month").toDate();

    activeSubscription.status = "active";
    activeSubscription.currentPlanName = plan.name;
    activeSubscription.planId = plan._id;
    activeSubscription.billingCycle = billingCycle;
    activeSubscription.priceSnapshot = {
      monthly: plan.pricing?.monthly,
      yearly: plan.pricing?.yearly,
      currency: plan.pricing?.currency,
      taxIncluded: plan.pricing?.taxIncluded,
    };
    activeSubscription.currentPeriodStart = effectiveStart;
    activeSubscription.currentPeriodEnd = currentPeriodEnd;
    activeSubscription.nextBillingDate = currentPeriodEnd;
    activeSubscription.updatedBy = req.user?._id;

    createSubscriptionEvent(
      activeSubscription,
      "downgraded",
      `Subscription downgraded from ${currentPlan?.name || "previous plan"} to ${plan.name}`,
      { previousPlanId, newPlanId: id, previousMonthly: currentMonthly, newMonthly },
      req.user?._id
    );

    await activeSubscription.save();

    store.planId = plan._id;
    store.planName = plan.name;
    store.billingCycle = billingCycle;
    store.subscriptionStatus = activeSubscription.status;
    store.currentSubscriptionId = activeSubscription._id;
    await store.save();

    res.status(200).json({
      success: true,
      message: "Subscription downgraded successfully",
      data: activeSubscription,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a plan (soft delete by archiving)
const deletePlan = async (req, res) => {
  try {
    const result = await PlanCatalogService.deletePlan(req.params.id, req.user?._id || null);
    return res.status(200).json({
      success: true,
      message: "Plan archived successfully",
      data: result,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }
};

// P18  getPlanAuditLog enrichi : filtres (action, severity, status, date, search, sort) + résumé
const getPlanAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      action = "",
      severity = "",
      status = "",
      userId = "",
      search = "",
      startDate = "",
      endDate = "",
      sort = "-createdAt",
    } = req.query;
    const skip = (page - 1) * limit;

    const query = { planId: id };
    if (action) query.action = action;
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) query.userId = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { summary: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
        { relatedEntity: { $regex: search, $options: "i" } },
      ];
    }

    const sortObject = {};
    if (typeof sort === "string") {
      if (sort.startsWith("-")) sortObject[sort.slice(1)] = -1;
      else if (sort.startsWith("+")) sortObject[sort.slice(1)] = 1;
      else sortObject[sort] = 1;
    }

    const total = await PlanAuditLog.countDocuments(query);
    const logs = await PlanAuditLog.find(query)
      .populate("userId", "name email")
      .populate("sourcePlanId", "name slug")
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit, 10));

    // P18  Résumé statistique des logs du plan
    const summary = await PlanAuditLog.aggregate([
      { $match: { planId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, action: "$_id", count: 1 } },
    ]);

    const bySeverity = await PlanAuditLog.aggregate([
      { $match: { planId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
      { $project: { _id: 0, severity: "$_id", count: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      summary: {
        byAction: summary,
        bySeverity,
      },
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUsageQuotas = async (req, res) => {
  try {
    const plans = await Plan.find({ status: "active" })
      .sort({ displayOrder: 1, createdAt: -1 });

    const stores = await Store.find({})
      .populate("planId", "name slug limits")
      .sort({ name: 1 });

    const storeIds = stores.map((store) => store._id);
    const storeUsageDocs = await StoreUsage.find({ storeId: { $in: storeIds } })
      .populate("quotaTypeId", "code");

    const usageByStore = buildUsageMapByStore(storeUsageDocs);

    const aggregated = stores.map((store) => {
      const plan = store.planId;
      const limits = plan?.limits ? Object.fromEntries(plan.limits) : {};
      const usage = getStoreUsage(store, usageByStore);
      const quotaKeys = new Set([...Object.keys(limits), ...Object.keys(usage)]);

      const quotaDetails = Array.from(quotaKeys).map((key) => {
        const limitValue = limits[key];
        const usedValue = usage[key] || 0;
        const isUnlimited = limitValue === null || limitValue === undefined;
        const percentage = isUnlimited ? null : Math.min(100, Math.round((usedValue / (limitValue || 1)) * 100));
        const isExceeding = !isUnlimited && usedValue > limitValue;

        return {
          key,
          limit: isUnlimited ? null : limitValue,
          used: usedValue,
          percentage,
          isExceeding,
        };
      });

      return {
        storeId: store._id,
        storeName: store.name,
        planId: plan?._id || null,
        planName: store.planName || plan?.name || "No Plan",
        quotaDetails,
        hasExceeding: quotaDetails.some((q) => q.isExceeding),
      };
    });

    const totalStores = stores.length;
    const totalPlans = plans.length;
    const storesExceeding = aggregated.filter((s) => s.hasExceeding).length;

    res.status(200).json({
      success: true,
      data: aggregated,
      summary: {
        totalStores,
        totalPlans,
        storesExceeding,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const generateInvoiceForPayment = async (req, res) => {
  try {
    const { subscriptionId, paymentId } = req.body;

    if (!subscriptionId || !paymentId) {
      return res.status(400).json({ success: false, message: "subscriptionId and paymentId are required" });
    }

    const subscription = await Subscription.findById(subscriptionId).populate("planId");
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    const plan = subscription.planId;
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found for this subscription" });
    }

    const store = await Store.findById(subscription.storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const items = [
      {
        description: `Plan: ${plan.name} (${plan.slug})`,
        quantity: 1,
        unitPrice: plan.pricing?.monthly || 0,
        total: plan.pricing?.monthly || 0,
      },
    ];

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal;

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const invoice = new Invoice({
      invoiceNumber,
      storeId: subscription.storeId,
      subscriptionId: subscription._id,
      planId: plan._id,
      items,
      subtotal,
      tax: 0,
      total,
      currency: payment.currency || "USD",
      status: "paid",
      paidAt: new Date(),
      paymentId: payment._id,
    });

    await invoice.save();

    payment.invoiceId = invoice._id;
    await payment.save();

    subscription.events.push({
      type: "invoice_created",
      message: `Invoice ${invoiceNumber} generated for payment`,
      data: { invoiceId: invoice._id, invoiceNumber, total, currency: payment.currency },
      actor: req.user?._id,
      createdAt: new Date(),
    });
    await subscription.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("storeId", "name")
      .populate("subscriptionId", "status billingCycle")
      .populate("planId", "name slug")
      .populate("paymentId", "amount currency status transactionId");

    res.status(201).json({ success: true, message: "Invoice generated successfully", data: populatedInvoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTrialSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      status: { $in: ["trial", "active"] },
    })
      .populate("storeId", "name slug")
      .populate("planId", "name slug pricing")
      .sort({ createdAt: -1 });

    const trialData = subscriptions.map((sub) => {
      const trialDays = sub.planId?.pricing?.trialDays || 0;
      const trialStartDate = sub.startedAt;
      const trialEndDate = sub.trialEndsAt || (sub.startedAt ? new Date(sub.startedAt.getTime() + trialDays * 24 * 60 * 60 * 1000) : null);

      const notifications = [];
      if (trialEndDate) {
        const daysUntilEnd = Math.ceil(
          (trialEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
        if (daysUntilEnd <= 7 && daysUntilEnd > 0) notifications.push("j7");
        if (daysUntilEnd <= 3 && daysUntilEnd > 0) notifications.push("j3");
        if (daysUntilEnd <= 1 && daysUntilEnd > 0) notifications.push("j1");
      }

      return {
        storeId: sub.storeId?._id,
        storeName: sub.storeId?.name || "Unknown",
        planId: sub.planId?._id,
        planName: sub.planId?.name || "No Plan",
        trialDays,
        trialStartDate: trialStartDate ? trialStartDate.toISOString() : null,
        trialEndDate: trialEndDate ? trialEndDate.toISOString() : null,
        status: sub.status,
        notifications,
      };
    });

    res.status(200).json({
      success: true,
      data: trialData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateTrialConfig = async (req, res) => {
  try {
    const { trialDays, notifications } = req.body;

    await Setting.findOneAndUpdate(
      { key: "trialConfig" },
      {
        key: "trialConfig",
        trialDays,
        notifications,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "Trial configuration updated successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const retryFailedPayment = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }
    if (subscription.chargeFailures >= 3) {
      return res.status(400).json({
        success: false,
        message: "Maximum retry attempts reached. Subscription suspended.",
      });
    }
    subscription.chargeFailures = (subscription.chargeFailures || 0) + 1;
    subscription.chargeRetryDate = dayjs().add(3, "day").toDate();
    await subscription.save();
    createSubscriptionEvent(
      subscription,
      "payment_retry",
      `Payment retry attempt ${subscription.chargeFailures}`,
      { chargeFailures: subscription.chargeFailures },
      req.user?._id
    );
    res.status(200).json({
      success: true,
      message: `Payment retry scheduled (attempt ${subscription.chargeFailures})`,
      data: subscription,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const checkTrialEndings = async (req, res) => {
  try {
    const now = new Date();
    const trialEndingSoon = await Subscription.find({
      status: "trial",
      trialEndDate: { $lte: dayjs(now).add(3, "day").toDate() },
    }).populate("storeId", "name").populate("planId", "name");

    const results = [];
    for (const sub of trialEndingSoon) {
      const daysRemaining = dayjs(sub.trialEndDate).diff(now, "day");
      if (daysRemaining <= 3 && daysRemaining >= 0) {
        results.push({
          subscriptionId: sub._id,
          storeName: sub.storeId?.name,
          planName: sub.planId?.name,
          trialEndDate: sub.trialEndDate,
          daysRemaining,
        });
        createSubscriptionEvent(
          sub,
          "trial_ending_soon",
          `Trial ending in ${daysRemaining} day(s)`,
          { daysRemaining, trialEndDate: sub.trialEndDate },
          req.user?._id
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Found ${results.length} trials ending soon`,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const processOverQuotaGracePeriods = async (req, res) => {
  try {
    const now = new Date();
    const expiredGracePeriods = await Subscription.find({
      "overQuotaItems.status": "grace_period",
      "overQuotaItems.graceUntil": { $lte: now },
    });

    const results = [];
    for (const sub of expiredGracePeriods) {
      const updatedItems = sub.overQuotaItems.map((item) => {
        if (item.status === "grace_period" && item.graceUntil <= now) {
          return { ...item, status: "degraded" };
        }
        return item;
      });
      sub.overQuotaItems = updatedItems;
      sub.downgradeBlocked = true;
      sub.downgradeBlockReason = "Grace period expired. Products beyond quota are now degraded.";
      await sub.save();

      for (const item of updatedItems) {
        if (item.status === "degraded") {
          createSubscriptionEvent(
            sub,
            "over_quota_degraded",
            `Over-quota grace period expired for ${item.quotaTypeCode}. Products beyond limit are now degraded.`,
            { quotaTypeCode: item.quotaTypeCode, current: item.current, newLimit: item.newLimit },
            req.user?._id
          );
        }
      }

      results.push({
        subscriptionId: sub._id,
        degradedItems: updatedItems.filter((i) => i.status === "degraded"),
      });
    }

    res.status(200).json({
      success: true,
      message: `Processed ${results.length} expired grace periods`,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// NOUVEAU: Get subscription history (plan changes for a store)
const getSubscriptionHistory = async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const history = await SubscriptionHistory.find({ storeId })
      .populate("oldPlanId", "name")
      .populate("newPlanId", "name")
      .populate("performedBy", "name email")
      .populate("invoiceId", "invoiceNumber total")
      .populate("paymentId", "gateway amount status")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: history || [],
      count: history?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// NOUVEAU: Get global subscription history with filters (Billing > Subscription History page)
const getAllSubscriptionHistory = async (req, res) => {
  try {
    const { storeId, action, startDate, endDate, page = 1, limit = 20, search = "" } = req.query;
    
    const query = {};
    
    if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
      query.storeId = storeId;
    }
    
    if (action && ["upgrade", "downgrade", "migrated", "assigned"].includes(action)) {
      query.action = action;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    // Si recherche par nom de store
    let storeIds = null;
    if (search) {
      const stores = await Store.find({ name: { $regex: search, $options: "i" } }).select("_id").lean();
      storeIds = stores.map(s => s._id);
      if (storeIds.length === 0) {
        return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 } });
      }
      query.storeId = { $in: storeIds };
    }
    
    const total = await SubscriptionHistory.countDocuments(query);
    const history = await SubscriptionHistory.find(query)
      .populate("storeId", "name")
      .populate("oldPlanId", "name")
      .populate("newPlanId", "name")
      .populate("performedBy", "name email")
      .populate("invoiceId", "invoiceNumber total")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Ajouter storeName pour facilité d'affichage
    const enriched = history.map(h => ({
      ...h,
      storeName: h.storeId?.name || "-",
    }));

    res.status(200).json({
      success: true,
      data: enriched,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// NOUVEAU: Get all subscription events across all stores (Billing > Subscription Events)
const getAllSubscriptionEvents = async (req, res) => {
  try {
    const { type, storeId, page = 1, limit = 50, search = "" } = req.query;
    
    const query = {};
    
    if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
      query.storeId = storeId;
    }
    
    if (type) {
      query["events.type"] = type;
    }
    
    const skip = (page - 1) * limit;
    
    // Récupérer les subscriptions et leurs events
    const subscriptions = await Subscription.find(query)
      .select("storeId events")
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Flatten events avec storeId
    const allEvents = subscriptions.flatMap((sub) =>
      (sub.events || []).map((event) => ({
        _id: event._id || `${sub._id}-${event.createdAt?.getTime()}`,
        subscriptionId: sub._id,
        storeId: sub.storeId,
        type: event.type,
        message: event.message,
        payload: event.data || {},
        status: event.type.includes("fail") || event.type.includes("error") ? "failed" : "success",
        createdBy: event.actor,
        createdAt: event.createdAt,
      }))
    );
    
    // Trier par date décroissante
    allEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Si recherche, filtrer par nom de store (nécessite lookup supplémentaire)
    let filtered = allEvents;
    if (search) {
      const stores = await Store.find({ name: { $regex: search, $options: "i" } }).select("_id name").lean();
      const storeNameMap = Object.fromEntries(stores.map(s => [s._id.toString(), s.name]));
      filtered = allEvents.filter(e => storeNameMap[e.storeId?.toString()]);
      // Enrichir avec store names
      filtered = filtered.map(e => ({
        ...e,
        storeName: storeNameMap[e.storeId?.toString()] || "-",
      }));
    }
    
    // Paginer le résultat flattened
    const total = filtered.length;
    const paginated = filtered.slice(0, parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllPlans,
  getActivePlans,
  getPlanById,
  createPlan,
  updatePlan,
  clonePlan,
  updatePlanStatus,
  activatePlan,
  deactivatePlan,
  archivePlan,
  assignPlanToStore,
  getAllSubscriptions,
  getPlanSubscriptions,
  getPlanSubscriptionsSummary,
  getPlanAffectedStores,
  getPlanHistory,
  getPlanAuditLog,
  getUsageQuotas,
  getTrialSubscriptions,
  updateTrialConfig,
  deletePlan,
  generateInvoiceForPayment,
  upgradeSubscription,
  downgradeSubscription,
  suspendSubscription,
  downgradePlanSubscription,
  retryFailedPayment,
  checkTrialEndings,
  processOverQuotaGracePeriods,
  getSubscriptionHistory,
  getAllSubscriptionHistory,
  getAllSubscriptionEvents,
};
