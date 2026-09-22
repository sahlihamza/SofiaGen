const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorType: {
      type: String,
      enum: ["platform_admin", "store_owner", "system"],
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
    },
    // Free-text action code, e.g. "product.update", "store.suspend",
    // "login", "permission_changed". NOT an enum on purpose  the set of
    // audited actions spans every module in the app (see AUDIT-2) and is
    // meant to grow without a schema migration each time. A restrictive
    // enum here previously caused most AuditService.logAction() calls
    // across the app to fail validation silently.
    action: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    entityType: {
      type: String,
      required: false,
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    resource: {
      type: {
        type: String,
        required: false,
        trim: true,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
      },
      name: {
        type: String,
        required: false,
        trim: true,
      },
    },
    summary: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    actorNameSnapshot: {
      type: String,
      default: "",
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    status: {
      type: String,
      required: true,
      default: "success",
      enum: ["success", "failed"],
    },
    severity: {
      type: String,
      required: true,
      default: "low",
      enum: ["low", "medium", "high", "critical"],
    },
    ip: {
      type: String,
      required: false,
    },
    sourceIp: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      required: false,
    },
    // Correlation id shared by every log/audit entry produced while
    // handling the same HTTP request (see middleware/requestId.js). Lets
    // the Super Admin trace API request -> audit -> webhook -> job -> email.
    requestId: {
      type: String,
      required: false,
      index: true,
    },
    sessionId: {
      type: String,
      required: false,
    },
  },
  {
    collection: "audit_logs",
    timestamps: true,
  }
);

auditLogSchema.index({ module: 1, action: 1, entityType: 1, entityId: 1, storeId: 1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ storeId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Append-only (AUDIT-SECURITY-2): audit entries must never be edited or
// deleted by normal application code, only created  otherwise a bad actor
// could tamper with history to hide what they did. The retention job is the
// one legitimate exception, and it must opt in explicitly per-call via
// { auditContext: { allowMutation: true } } (see LOG-RETENTION-1's job).
const blockMutation = function (next) {
  const options = typeof this.getOptions === "function" ? this.getOptions() : this.options || {};
  const allowMutation = options?.auditContext?.allowMutation === true;
  if (allowMutation) return next();
  next(new Error("AuditLog records are append-only: update/delete is not permitted."));
};

auditLogSchema.pre("updateOne", blockMutation);
auditLogSchema.pre("findOneAndUpdate", blockMutation);
auditLogSchema.pre("updateMany", blockMutation);
auditLogSchema.pre("deleteOne", blockMutation);
auditLogSchema.pre("findOneAndDelete", blockMutation);
auditLogSchema.pre("deleteMany", blockMutation);

module.exports = mongoose.model("AuditLog", auditLogSchema);
