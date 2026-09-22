const mongoose = require("mongoose");

const planFeatureSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    featureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feature",
      required: false,
    },
    featureGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeatureGroup",
      required: false,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    limit: {
      type: Number,
      default: null,
      required: false,
    },
    // NOUVEAU: Gestion du cycle de vie des features
    status: {
      type: String,
      enum: ["active", "deprecated", "removed"],
      default: "active",
    },
    deprecatedAt: {
      type: Date,
      default: null,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    graceUntil: {
      type: Date,
      default: null, // Feature disabled aprés cette date pour nouvelles subscriptions
    },
    // Pour existing subscriptions: keep or revoke?
    actionOnRemoval: {
      type: String,
      enum: ["keep_for_existing", "revoke_after_grace"],
      default: "keep_for_existing",
    },
  },
  {
    timestamps: true,
  }
);

// Index principal + index pour les features actives/deprecated
planFeatureSchema.index({ planId: 1, code: 1 }, { unique: true });
planFeatureSchema.index({ status: 1, graceUntil: 1 }); // Pour les queries de grace period

module.exports = mongoose.model("PlanFeature", planFeatureSchema);
