import { describe, expect, it } from "vitest";
import { buildPlanPayload } from "./planPayload";

describe("buildPlanPayload", () => {
  it("normalizes map-based features and limits while preserving version and strategy", () => {
    const features = new Map([["feature_a", true]]);
    const limits = new Map([["quota_a", 5]]);

    const payload = buildPlanPayload(
      {
        name: "Starter",
        features,
        limits,
        version: 3,
      },
      "new_subscribers_only"
    );

    expect(payload.features).toEqual({ feature_a: true });
    expect(payload.limits).toEqual({ quota_a: 5 });
    expect(payload.version).toBe(3);
    expect(payload.strategy).toBe("new_subscribers_only");
  });

  it("normalizes snake_case features and limits, converts storage_mb to storage (GB), maps team_members to admins, and derives slug from name", () => {
    const plan = {
      name: "Seed Growth",
      // slug intentionally missing to test fallback
      features: { multi_store: true, priority_support: true, custom_branding: true },
      limits: { products: 1000, storage_mb: 10240, team_members: 10 },
    };

    const payload = buildPlanPayload(plan, "new_subscribers_only");

    expect(payload.features).toEqual({ multiStore: true, prioritySupport: true, customBranding: true });
    expect(payload.limits).toEqual({ products: 1000, storage: 10, admins: 10 });
    expect(payload.slug).toBe("seed-growth");
    expect(payload.strategy).toBe("new_subscribers_only");
  });
});
