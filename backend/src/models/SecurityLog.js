const mongoose = require("mongoose");

// SECURITY-LOG-1: dedicated feed of security-relevant events so the Super
// Admin can spot suspicious behaviour (repeated failed logins, unexpected
// permission changes, impersonation, etc.) without wading through the full
// audit trail.
const securityLogSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      enum: [
        "login",
        "failed_login",
        "logout",
        "password_changed",
        "2fa_enabled",
        "2fa_disabled",
        "session_revoked",
        "permission_changed",
        "role_changed",
        "impersonation_started",
        "impersonation_ended",
      ],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      index: true,
    },
    ip: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    requestId: {
      type: String,
      required: false,
      index: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: "security_logs",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

securityLogSchema.index({ event: 1, createdAt: -1 });
securityLogSchema.index({ userId: 1, createdAt: -1 });
securityLogSchema.index({ email: 1, createdAt: -1 });
securityLogSchema.index({ createdAt: -1 });

// Same append-only guarantee as AuditLog  security history must not be
// alterable by the account it concerns.
const blockMutation = function (next) {
  const options = typeof this.getOptions === "function" ? this.getOptions() : this.options || {};
  if (options?.auditContext?.allowMutation === true) return next();
  next(new Error("SecurityLog records are append-only: update/delete is not permitted."));
};
securityLogSchema.pre("updateOne", blockMutation);
securityLogSchema.pre("findOneAndUpdate", blockMutation);
securityLogSchema.pre("updateMany", blockMutation);
securityLogSchema.pre("deleteOne", blockMutation);
securityLogSchema.pre("findOneAndDelete", blockMutation);
securityLogSchema.pre("deleteMany", blockMutation);

module.exports = mongoose.model("SecurityLog", securityLogSchema);
