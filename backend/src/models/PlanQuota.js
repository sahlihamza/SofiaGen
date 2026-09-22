const mongoose = require("mongoose");

const planQuotaSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    quotaTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuotaType",
      required: false,
    },
    quotaTypeCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
limitValue: {
      type: Number,
      default: null,
      required: false,
    },
    isUnlimited: {
      type: Boolean,
      default: false,
    },
    // P17  Soft Limits
    // Seuils exprimés en pourcentage d'utilisation du quota (0-100)
    warningThreshold: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    criticalThreshold: {
      type: Number,
      default: 95,
      min: 0,
      max: 100,
    },
    blockedThreshold: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    // Actions  exécuter quand le quota est bloqué
    blockedAction: {
      type: String,
      enum: ["block", "read_only", "grace_period", "notify"],
      default: "block",
    },
    softLimitEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

planQuotaSchema.index({ planId: 1, quotaTypeCode: 1 }, { unique: true });

module.exports = mongoose.model("PlanQuota", planQuotaSchema);
