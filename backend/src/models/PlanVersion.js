const mongoose = require("mongoose");

/**
 * PlanVersion  immutable full snapshot of a Plan at a point in time.
 *
 * Every modification of a Plan persists a complete snapshot: general info,
 * pricing, features, quotas/limits, featureRefs, status, version metadata.
 *
 * Allows full rollback to any previous version (P13).
 */
const planVersionSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },

    // Snapshot payload (denormalized copy of the Plan document)
    snapshot: {
      name: { type: String, required: true },
      slug: { type: String, required: true },
      description: { type: String, required: false },
      badge: { type: String, required: false },
      color: { type: String, default: "#3B82F6" },
      icon: { type: String, required: false },

      // Pricing shape mirrors Plan.pricing
      pricing: {
        monthly: { type: Number, required: false },
        yearly: { type: Number, required: false },
        currency: { type: String, default: "USD" },
        taxIncluded: { type: Boolean, default: false },
        trialDays: { type: Number, default: 0 },
        effectiveFrom: { type: Date, required: false },
        effectiveTo: { type: Date, required: false },
      },

      // Legacy feature map (key -> boolean)
      features: {
        type: Map,
        of: Boolean,
        default: new Map(),
      },

      // Legacy limits map (key -> number | null)
      limits: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map(),
      },

      // Referenced PlanFeature docs (snapshot)
      featureRefs: [
        {
          featureId: { type: mongoose.Schema.Types.ObjectId, ref: "Feature", required: false },
          featureGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "FeatureGroup", required: false },
          code: { type: String, required: false },
          enabled: { type: Boolean, default: true },
          limit: { type: Number, default: null },
        },
      ],

      // Referenced PlanQuota docs (snapshot)
      quotaRefs: [
        {
          quotaTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "QuotaType", required: false },
          quotaTypeCode: { type: String, required: false },
          limitValue: { type: Number, default: null },
          isUnlimited: { type: Boolean, default: false },
          softWarningAt: { type: Number, default: null },
          softCriticalAt: { type: Number, default: null },
          softBlockedAt: { type: Number, default: null },
        },
      ],

      status: {
        type: String,
        enum: ["draft", "active", "inactive", "archived"],
        default: "draft",
      },
      isDefault: { type: Boolean, default: false },
      displayOrder: { type: Number, default: 0 },
      visibility: {
        type: String,
        enum: ["public", "private", "invitation", "internal", "deprecated"],
        default: "public",
      },
      notes: { type: String, required: false },
    },

    // Change metadata
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    isImmutable: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      required: false,
      default: null,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    versionNote: { type: String, required: false },
    changeDescription: { type: String, required: false },
    source: {
      type: String,
      enum: ["create", "update", "clone", "rollback", "seeder"],
      default: "update",
    },

    // Diff summary (what changed vs previous version)
    changesSummary: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    ipAddress: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

// Indexes

const IMMUTABLE_MESSAGE =
  "Cannot mutate a published PlanVersion: features and quotas are frozen once published";

planVersionSchema.pre("save", function (next) {
  if (!this.isImmutable) return next();
  if (this.isNew) return next();
  if (this.isModified("snapshot")) {
    const err = new Error(IMMUTABLE_MESSAGE);
    err.code = "PLAN_VERSION_IMMUTABLE";
    return next(err);
  }
  next();
});

const blockImmutableUpdate = async function (next) {
  const update = this.getUpdate() || {};
  const flat = { ...(update.$set || {}), ...update };
  const touchesSnapshot = Object.keys(flat).some((k) => k === "snapshot" || k.startsWith("snapshot."));
  if (!touchesSnapshot) return next();

  const target = await this.model.findOne(this.getFilter()).select("isImmutable").lean();
  if (target && target.isImmutable) {
    const err = new Error(IMMUTABLE_MESSAGE);
    err.code = "PLAN_VERSION_IMMUTABLE";
    return next(err);
  }
  next();
};

planVersionSchema.pre("findOneAndUpdate", blockImmutableUpdate);
planVersionSchema.pre("updateOne", blockImmutableUpdate);

planVersionSchema.index({ planId: 1, status: 1 });

planVersionSchema.index({ planId: 1, version: 1 }, { unique: true });
planVersionSchema.index({ planId: 1, createdAt: -1 });
planVersionSchema.index({ version: 1 });

const PlanVersion = mongoose.model("PlanVersion", planVersionSchema);

module.exports = PlanVersion;

