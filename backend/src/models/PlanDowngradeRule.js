const mongoose = require("mongoose");

/**
 * PlanDowngradeRule (P5)
 *
 * Defines how a subscription transitions from one plan to a lower plan,
 * and the policy applied when the store is over-quota on the target plan.
 *
 * Policy when quota exceeded on the target plan:
 *   - refuse            : downgrade is not allowed until quota is reduced
 *   - require_deletion  : downgrade allowed only if the store deletes data first
 *   - read_only         : downgrade allowed, but exceeding features become read-only
 *   - grace_period      : downgrade allowed, store gets a grace period to reduce usage
 */
const downgradeRuleSchema = new mongoose.Schema(
  {
    // Source plan (higher plan)
    fromPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    // Target plan (lower plan)
    toPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    // Policy applied when the store exceeds target plan quota
    quotaExceedPolicy: {
      type: String,
      enum: ["refuse", "require_deletion", "read_only", "grace_period"],
      default: "grace_period",
    },
    // Grace period (days) granted when policy === "grace_period"
    graceDays: {
      type: Number,
      default: 7,
      min: 0,
    },
    // Whether the downgrade can happen automatically (no approval)
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    approvedByRole: {
      type: String,
      enum: ["sales_manager", "finance", "admin", "store_owner", "any"],
      default: "any",
    },
    // When the downgrade takes effect
    effectiveStrategy: {
      type: String,
      enum: ["immediate", "next_renewal", "end_of_day", "manual_approval"],
      default: "next_renewal",
    },
    // Whether to issue a prorated credit for the unused portion
    issueProratedCredit: {
      type: Boolean,
      default: true,
    },
    // Whether to preserve data that exceeds the target plan quota
    preserveExcessData: {
      type: Boolean,
      default: true,
    },
    // Minimum days a store must stay on the source plan before downgrading
    minDaysOnPlan: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Optional: restrict which stores can use this rule
    appliesTo: {
      type: String,
      enum: ["all", "specific_stores", "specific_plans"],
      default: "all",
    },
    // Versioning + status
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
    },
    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

// Indexes
downgradeRuleSchema.index({ fromPlanId: 1, toPlanId: 1 }, { unique: true });
downgradeRuleSchema.index({ toPlanId: 1, status: 1 });
downgradeRuleSchema.index({ name: "text", description: "text" });

const PlanDowngradeRule = mongoose.model("PlanDowngradeRule", downgradeRuleSchema);
module.exports = PlanDowngradeRule;
