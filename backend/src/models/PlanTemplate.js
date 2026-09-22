const mongoose = require("mongoose");

/**
 * PlanTemplate  reusable pre-configured plan blueprint (P14).
 *
 * Templates describe a full plan configuration (Starter, Professional,
 * Business, Enterprise) that can be instantiated into a real Plan document
 * with one click. They are NOT Plans themselves; they generate them.
 */
const planTemplateSchema = new mongoose.Schema(
  {
    // Identity
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Template slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    badge: { type: String, required: false },
    color: { type: String, default: "#3B82F6" },
    icon: { type: String, required: false },

    // Pricing blueprint
    pricing: {
      monthly: { type: Number, default: 0, min: 0 },
      yearly: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: "USD" },
      taxIncluded: { type: Boolean, default: false },
      trialDays: { type: Number, default: 0, min: 0 },
    },

    // Feature blueprint  array of { code, enabled, limit, featureGroupId }
    features: [
      {
        code: { type: String, required: true, trim: true, lowercase: true },
        enabled: { type: Boolean, default: true },
        limit: { type: Number, default: null },
        featureId: { type: mongoose.Schema.Types.ObjectId, ref: "Feature", required: false },
        featureGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "FeatureGroup", required: false },
      },
    ],

    // Quota blueprint  array of { quotaTypeCode, limitValue, isUnlimited, softLimits }
    quotas: [
      {
        quotaTypeCode: { type: String, required: true, trim: true, lowercase: true },
        quotaTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "QuotaType", required: false },
        limitValue: { type: Number, default: null },
        isUnlimited: { type: Boolean, default: false },
        softWarningAt: { type: Number, default: null },
        softCriticalAt: { type: Number, default: null },
        softBlockedAt: { type: Number, default: null },
      },
    ],

    // Options
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active",
    },
    isDefault: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    visibility: {
      type: String,
      enum: ["public", "private", "internal"],
      default: "public",
    },
    notes: { type: String, required: false },

    // Stats
    instantiateCount: { type: Number, default: 0 },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  {
    timestamps: true,
  }
);

// Indexes
planTemplateSchema.index({ slug: 1 }, { unique: true });
planTemplateSchema.index({ status: 1 });
planTemplateSchema.index({ isDefault: 1 });

const PlanTemplate = mongoose.model("PlanTemplate", planTemplateSchema);

module.exports = PlanTemplate;
