const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    // General Information
    name: {
      type: String,
      required: [true, "Plan name is required"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Plan slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["starter", "business", "enterprise", "custom"],
      required: false,
    },
    currentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlanVersion",
      required: false,
      default: null,
    },
    deletedAt: {
      type: Date,
      required: false,
      default: null,
    },
    description: {
      type: String,
      required: false,
    },
    badge: {
      type: String,
      required: false,
    },
    color: {
      type: String,
      default: "#3B82F6",
    },
    icon: {
      type: String,
      required: false,
    },

    // Versioning
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    versionNote: {
      type: String,
      required: false,
    },

    // Current Pricing (active version)
    pricing: {
      monthly: {
        type: Number,
        required: false,
        min: 0,
      },
      yearly: {
        type: Number,
        required: false,
        min: 0,
      },
      currency: {
        type: String,
        default: "USD",
        enum: ["USD", "EUR", "GBP", "CHF", "CAD", "AUD", "ZAR", "TND", "EGP"],
      },
      taxIncluded: {
        type: Boolean,
        default: false,
      },
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    requirePaymentMethodForTrial: {
      type: Boolean,
      default: false,
    },
      effectiveFrom: {
        type: Date,
        required: false,
      },
      effectiveTo: {
        type: Date,
        required: false,
      },
    },

    // Pricing History (all versions)
    pricingHistory: [
      {
        version: { type: Number, required: true },
        monthly: { type: Number, required: true },
        yearly: { type: Number, required: true },
        currency: { type: String, default: "USD" },
        taxIncluded: { type: Boolean, default: false },
        trialDays: { type: Number, default: 0 },
        effectiveFrom: { type: Date, required: true },
        effectiveTo: { type: Date, required: false },
        changeDescription: { type: String, required: false },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: false,
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Features (legacy compatibility: each feature is a key with boolean value)
    features: {
      type: Map,
      of: Boolean,
      default: new Map(),
    },

    featureRefs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlanFeature",
      required: false,
    }],

    // Quotas/Limits (each quota is a key with numeric value or null for unlimited)
    limits: {
      type: Map,
      of: mongoose.Schema.Types.Mixed, // Can be number or null
      default: new Map(),
    },

// Status
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
      lowercase: true,
    },

    // Visibility (P15): public, private, invitation, internal, deprecated
    visibility: {
      type: String,
      enum: ["public", "private", "invitation", "internal", "deprecated"],
      default: "public",
      lowercase: true,
    },

    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Metadata
    isDefault: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    scheduledDeactivationAt: {
      type: Date,
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search and filtering
planSchema.index({ slug: 1, status: 1 });
planSchema.index({ code: 1 }, { unique: true, sparse: true });
planSchema.index({ deletedAt: 1 });
planSchema.index({ category: 1, status: 1 });
planSchema.index({ name: "text", description: "text" });
planSchema.index({ "pricing.effectiveFrom": 1, "pricing.effectiveTo": 1 });
planSchema.index({ version: 1 });

const Plan = mongoose.model("Plan", planSchema);

module.exports = Plan;
