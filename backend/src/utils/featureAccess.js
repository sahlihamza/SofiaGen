/**
 * Détermine si une feature est accessible pour un store/subscription
 * selon son statut dans le plan (active, deprecated, removed) et la grace period.
 * 
 * @param {Object} planFeature - Document PlanFeature avec status, graceUntil, actionOnRemoval
 * @param {Object} subscription - Document Subscription (optionnel, pour les nouvelles subscriptions = null)
 * @param {Date} currentDate - Date actuelle (pour les tests)
 * @returns {Object} { hasAccess: boolean, reason: string, gracePeriodEnds: Date|null }
 */
const checkFeatureAccess = (planFeature, subscription = null, currentDate = new Date()) => {
  if (!planFeature) {
    return { hasAccess: false, reason: "Feature not found in plan", gracePeriodEnds: null };
  }

  // Si disabled au niveau du plan
  if (!planFeature.enabled) {
    return { hasAccess: false, reason: "Feature disabled in plan", gracePeriodEnds: null };
  }

  const isNewSubscription = !subscription;

  console.log(`Checking feature access: code=${planFeature.code}, status=${planFeature.status}, graceUntil=${planFeature.graceUntil}, isNewSubscription=${isNewSubscription}`);

  switch (planFeature.status) {
    case "active":
      return {
        hasAccess: true,
        reason: "Feature is active",
        gracePeriodEnds: null,
      };

    case "deprecated": {
      // New subscriptions: peuvent pas avoir cette feature
      if (isNewSubscription) {
        if (planFeature.graceUntil && currentDate > new Date(planFeature.graceUntil)) {
          return {
            hasAccess: false,
            reason: "Feature deprecated and grace period expired",
            gracePeriodEnds: planFeature.graceUntil,
          };
        }
        // Grace period toujours valide: allow mais avec warning
        return {
          hasAccess: true,
          reason: "Feature deprecated, grace period active",
          gracePeriodEnds: planFeature.graceUntil,
        };
      }

      // Existing subscriptions: gardent l'accès selon actionOnRemoval
      if (planFeature.actionOnRemoval === "keep_for_existing") {
        return {
          hasAccess: true,
          reason: "Feature deprecated but kept for existing subscriptions",
          gracePeriodEnds: planFeature.graceUntil,
        };
      }

      // revoke_after_grace: check si grace period est passé
      if (planFeature.graceUntil && currentDate > new Date(planFeature.graceUntil)) {
        return {
          hasAccess: false,
          reason: "Feature deprecated and grace period expired",
          gracePeriodEnds: planFeature.graceUntil,
        };
      }

      // Grace period toujours valide
      return {
        hasAccess: true,
        reason: "Feature deprecated, grace period active",
        gracePeriodEnds: planFeature.graceUntil,
      };
    }

    case "removed":
      return {
        hasAccess: false,
        reason: "Feature removed from plan",
        gracePeriodEnds: planFeature.graceUntil || null,
      };

    default:
      return {
        hasAccess: false,
        reason: `Unknown feature status: ${planFeature.status}`,
        gracePeriodEnds: null,
      };
  }
};

/**
 * Vérifie si un store a accès  une liste de features
 * Retourne { features: Object, warnings: Array }
 */
const checkMultipleFeatureAccess = (planFeaturesMap, subscription = null, currentDate = new Date()) => {
  const features = {};
  const warnings = [];

  for (const [code, planFeature] of Object.entries(planFeaturesMap)) {
    const result = checkFeatureAccess(planFeature, subscription, currentDate);
    features[code] = result.hasAccess;

    if (result.gracePeriodEnds) {
      warnings.push({
        code,
        type: "grace_period",
        message: `Feature '${code}' will be disabled after ${result.gracePeriodEnds.toLocaleDateString()}`,
        expiresAt: result.gracePeriodEnds,
      });
    }

    if (!result.hasAccess && planFeature.status !== "removed") {
      warnings.push({
        code,
        type: "access_denied",
        message: result.reason,
        reason: result.reason,
      });
    }
  }

  return { features, warnings };
};

module.exports = {
  checkFeatureAccess,
  checkMultipleFeatureAccess,
};
