const PlanFeature = require("../models/PlanFeature");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Store = require("../models/Store");

/**
 * Nettoie les features deprecated dont la grace period est expiré.
 * - Passe status de "deprecated"  "removed"
 * - Met  jour removedAt
 * - Détermine si les subscriptions existantes doivent perdre l'accès
 */
const cleanupExpiredFeatures = async () => {
  const now = new Date();

  // 1. Récupérer toutes les features deprecated dont graceUntil est dépassé
  const expiredFeatures = await PlanFeature.find({
    status: "deprecated",
    graceUntil: { $lte: now },
  });

  if (expiredFeatures.length === 0) {
    console.log("[feature-cleanup] No expired features to clean up.");
    return { updated: 0, notifications: [] };
  }

  console.log(`[feature-cleanup] Found ${expiredFeatures.length} expired features to process.`);

  const notifications = [];
  let updatedCount = 0;

  for (const planFeature of expiredFeatures) {
    // 2. Récupérer le plan et la feature pour avoir les noms
    const plan = await Plan.findById(planFeature.planId);
    const featureName = await getFeatureName(planFeature.code);

    // 3. Marquer comme removed
    await PlanFeature.findByIdAndUpdate(planFeature._id, {
      status: "removed",
      removedAt: now,
    });

    updatedCount++;

    // 4. Si actionOnRemoval = "revoke_after_grace", notifier les stores concernés
    if (planFeature.actionOnRemoval === "revoke_after_grace") {
      // Récupérer toutes les subscriptions actives pour ce plan
      const subscriptions = await Subscription.find({
        planId: planFeature.planId,
        status: { $in: ["active", "trial", "past_due"] },
      }).populate("storeId", "name email");

      for (const sub of subscriptions) {
        notifications.push({
          storeId: sub.storeId?._id,
          storeName: sub.storeId?.name,
          storeEmail: sub.storeId?.email,
          planId: planFeature.planId,
          planName: plan?.name,
          featureCode: planFeature.code,
          featureName,
          graceUntil: planFeature.graceUntil,
          message: `The feature "${featureName}" will be disabled on ${planFeature.graceUntil.toLocaleDateString()} for your plan "${plan?.name}". Upgrade to keep this feature.`,
        });
      }
    }
  }

  console.log(`[feature-cleanup] Updated ${updatedCount} features to removed.`);
  return { updated: updatedCount, notifications };
};

/**
 * Récupère le nom d'une feature depuis la collection Feature
 */
const getFeatureName = async (code) => {
  const Feature = require("../models/Feature");
  const feature = await Feature.findOne({ code });
  return feature?.name || code;
};

/**
 * Vérifie si un store a accès  une feature (helper pour les controllers)
 */
const checkStoreFeatureAccess = async (storeId, featureCode, planFeatures = null) => {
  const store = await Store.findById(storeId).populate("currentSubscriptionId");
  if (!store || !store.currentSubscriptionId) {
    return false;
  }

  const subscription = store.currentSubscriptionId;
  const plan = await Plan.findById(subscription.planId);

  if (!planFeatures) {
    planFeatures = await PlanFeature.find({ planId: plan._id });
  }

  const planFeature = planFeatures.find((pf) => pf.code === featureCode);
  if (!planFeature) {
    return false;
  }

  const { checkFeatureAccess } = require("../utils/featureAccess");
  const result = checkFeatureAccess(planFeature, subscription);
  return result.hasAccess;
};

module.exports = {
  cleanupExpiredFeatures,
  checkStoreFeatureAccess,
};
