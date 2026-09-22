const mongoose = require("mongoose");

const planAuditLogSchema = new mongoose.Schema(
  {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "update",
        "clone",
        "activate",
        "deactivate",
        "archive",
        "delete",
        "visibility_change",
        "pricing_change",
        "feature_change",
        "quota_change",
        "rollback",
        "bulk_update",
      ],
    },
    // P18  Avant / Aprés (snapshots complets des champs modifiés)
    before: { type: mongoose.Schema.Types.Mixed, required: false },
    after: { type: mongoose.Schema.Types.Mixed, required: false },
    fieldChanges: { type: mongoose.Schema.Types.Mixed, required: false },
    relatedEntity: { type: String, required: false },
    sourcePlanId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    ipAddress: { type: String, required: false },
    sourceIp: { type: String, required: false },
    userAgent: { type: String, required: false },
    // P18  Métadonnés enrichies
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    entityType: {
      type: String,
      default: "plan",
      trim: true,
    },
    version: { type: Number, required: false },
    metadata: { type: mongoose.Schema.Types.Mixed, required: false },
    summary: { type: String, required: false },
  },
  { timestamps: true }
);

// P18  Index optimisés pour le filtrage/recherche
planAuditLogSchema.index({ planId: 1, createdAt: -1 });
planAuditLogSchema.index({ userId: 1, createdAt: -1 });
planAuditLogSchema.index({ action: 1, createdAt: -1 });
planAuditLogSchema.index({ severity: 1, createdAt: -1 });
planAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("PlanAuditLog", planAuditLogSchema);
