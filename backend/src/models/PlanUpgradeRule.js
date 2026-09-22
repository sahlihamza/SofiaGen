const mongoose = require("mongoose");

/**
 * PlanUpgradeRule (P4)
 *
 * Defines how a subscription transitions from one plan to a higher plan,
 * and the billing strategy applied to the existing billing period.
 *
 * Strategies:
 *   - immediate        : switch now, bill full new price immediately
 *   - prorata          : credit unused days of current period + charge remaining
 *   - next_renewal     : switch at next billing cycle boundary
 *   - manual_approval  : requires a human approval before the switch happens
 */
const upgradeRuleSchema = new mongoose.Schema(
  {
    // Source plan (lower plan)
    fromPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    // Target plan (higher plan)
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
    // Billing strategy on upgrade
    strategy: {
      type: String,
      enum: ["immediate", "prorata", "next_renewal", "manual_approval"],
      default: "prorata",
    },
    // Whether the upgrade can happen automatically (no approval)
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    approvedByRole: {
      type: String,
      enum: ["sales_manager", "finance", "admin", "store_owner", "any"],
      default: "any",
    },
    // Prorata calculation mode
    prorataMode: {
      type: String,
      enum: ["daily", "hourly", "percentage"],
      default: "daily",
    },
    // If strategy === "next_renewal", allow the store owner to schedule it
    allowSchedule: {
      type: Boolean,
      default: true,
    },
    // Minimum time a store must stay on the source plan before upgrading
    minDaysOnPlan: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Whether to generate an invoice immediately on upgrade
    generateInvoiceImmediately: {
      type: Boolean,
      default: true,
    },
    // Optional: restrict which stores can use this rule
    appliesTo: {
      type: String,
      enum: ["all", "specific_stores", "specific_plans"],
      default: "all",
    },
    storeIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Store",
      default: [],
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
upgradeRuleSchema.index({ fromPlanId: 1, toPlanId: 1 }, { unique: true });
upgradeRuleSchema.index({ fromPlanId: 1, status: 1 });
upgradeRuleSchema.index({ toPlanId: 1, status: 1 });
upgradeRuleSchema.index({ name: "text", description: "text" });

const PlanUpgradeRule = mongoose.model("PlanUpgradeRule", upgradeRuleSchema);
module.exports = PlanUpgradeRule;
