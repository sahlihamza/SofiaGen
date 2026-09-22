const { checkFeatureAccess, checkMultipleFeatureAccess } = require("../utils/featureAccess");
const dayjs = require("dayjs");

describe("Feature Access Control (Retention vs Disabling)", () => {
  const currentDate = dayjs("2024-01-15").toDate();

  describe("checkFeatureAccess", () => {
    it("should grant full access for active features", () => {
      const planFeature = {
        code: "marketplace",
        enabled: true,
        status: "active",
        graceUntil: null,
        actionOnRemoval: "keep_for_existing",
      };

      const result = checkFeatureAccess(planFeature);

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe("Feature is active");
      expect(result.gracePeriodEnds).toBeNull();
    });

    it("should deny access when feature is disabled in plan", () => {
      const planFeature = {
        code: "marketplace",
        enabled: false, // Disabled in plan
        status: "active",
        graceUntil: null,
      };

      const result = checkFeatureAccess(planFeature);

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Feature disabled in plan");
    });

    it("should deny access for new subscriptions when feature is deprecated and grace period expired", () => {
      const planFeature = {
        code: "marketplace",
        enabled: true,
        status: "deprecated",
        graceUntil: dayjs("2024-01-10").toDate(), // Expired
        actionOnRemoval: "keep_for_existing",
      };

      const result = checkFeatureAccess(planFeature, null, currentDate);

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Feature deprecated and grace period expired");
      expect(result.gracePeriodEnds).toEqual(planFeature.graceUntil);
    });

    it("should grant access for existing subscriptions when feature is deprecated and keep_for_existing", () => {
      const planFeature = {
        code: "marketplace",
        enabled: true,
        status: "deprecated",
        graceUntil: dayjs("2024-01-20").toDate(), // Not yet expired
        actionOnRemoval: "keep_for_existing",
      };

      const subscription = {
        _id: "sub-123",
        status: "active",
      };

      const result = checkFeatureAccess(planFeature, subscription, currentDate);

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe("Feature deprecated but kept for existing subscriptions");
    });

    it("should deny access for existing subscriptions when feature is deprecated, grace expired, and revoke_after_grace", () => {
      const planFeature = {
        code: "marketplace",
        enabled: true,
        status: "deprecated",
        graceUntil: dayjs("2024-01-10").toDate(), // Expired
        actionOnRemoval: "revoke_after_grace",
      };

      const subscription = {
        _id: "sub-123",
        status: "active",
      };

      const result = checkFeatureAccess(planFeature, subscription, currentDate);

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Feature deprecated and grace period expired");
    });

    it("should grant access for existing subscriptions when grace period is still active (revoke_after_grace)", () => {
      const planFeature = {
        code: "marketplace",
        enabled: true,
        status: "deprecated",
        graceUntil: dayjs("2024-01-20").toDate(), // Not yet expired
        actionOnRemoval: "revoke_after_grace",
      };

      const subscription = {
        _id: "sub-123",
        status: "active",
      };

      const result = checkFeatureAccess(planFeature, subscription, currentDate);

      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe("Feature deprecated, grace period active");
    });

    it("should deny access when feature is removed", () => {
      const planFeature = {
        code: "marketplace",
        enabled: true,
        status: "removed",
        removedAt: dayjs("2024-01-10").toDate(),
      };

      const result = checkFeatureAccess(planFeature);

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Feature removed from plan");
    });

    it("should handle unknown feature status", () => {
      const planFeature = {
        code: "marketplace",
        enabled: true,
        status: "unknown",
      };

      const result = checkFeatureAccess(planFeature);

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Unknown feature status: unknown");
    });

    it("should return no access when feature not in plan", () => {
      const result = checkFeatureAccess(null);

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe("Feature not found in plan");
    });
  });

  describe("checkMultipleFeatureAccess", () => {
    it("should check multiple features and return correct access map", () => {
      const planFeaturesMap = {
        marketplace: {
          code: "marketplace",
          enabled: true,
          status: "active",
        },
        apiAccess: {
          code: "apiAccess",
          enabled: true,
          status: "deprecated",
          graceUntil: dayjs("2024-01-20").toDate(),
          actionOnRemoval: "keep_for_existing",
        },
        customBranding: {
          code: "customBranding",
          enabled: true,
          status: "removed",
          removedAt: dayjs("2024-01-10").toDate(),
        },
      };

      const result = checkMultipleFeatureAccess(planFeaturesMap, null, currentDate);

      expect(result.features.marketplace).toBe(true);
      expect(result.features.apiAccess).toBe(true); // Despite deprecated (grace period active)
      expect(result.features.customBranding).toBe(false); // Removed

      expect(result.warnings).toHaveLength(1); // Only apiAccess has grace period warning
      expect(result.warnings[0].code).toBe("apiAccess");
      expect(result.warnings[0].type).toBe("grace_period");
    });
  });

  describe("Day 31 scenario (grace period expires)", () => {
    it("should deny access on day 31 when grace period was originally 30 days", () => {
      const createdAt = dayjs("2024-01-01").toDate();
      const graceUntil = dayjs(createdAt).add(30, "day").toDate(); // Jan 31, 2024
      const today = dayjs("2024-01-31").toDate(); // Groceries get disabled

      const planFeature = {
        code: "marketplace",
        enabled: true,
        status: "deprecated",
        graceUntil: graceUntil,
        actionOnRemoval: "revoke_after_grace",
        createdAt,
      };

      const result = checkFeatureAccess(planFeature, null, today);
      expect(result.hasAccess).toBe(false);
    });
  });
});
