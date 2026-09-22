const mongoose = require("mongoose");

/**
 * PlanEligibilityRule (P16)
 *
 * Gates which stores/users can subscribe to a plan. A rule is a set of nested
 * groups of conditions (AND/OR/NOT) that, when satisfied, make a store eligible
 * for the plan. Optionally requires manual commercial approval.
 *
 * Examples (no-code):
 *   - Revenue > 5000
 *   - Orders > 1000
 *   - Custom store flag / internal invitation
 *   - Manual commercial validation by sales manager
 */
const eligibilityGroupSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // client-generated id for rule-builder tree
    logicOperator: {
      type: String,
      enum: ["AND", "OR", "NOT"],
      default: "AND",
    },
    // Nested groups (recursive)  condition refs stored as objects
    children: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    conditionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
  },
  { _id: false }
);

const planEligibilityRuleSchema = new mongoose.Schema(
  {
    // Target plan
    planId: {
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
    // Scope controls when the rule is evaluated
    appliesTo: {
      type: String,
      enum: ["all", "new_stores", "existing_stores", "specific_stores"],
      default: "new_stores",
    },
    // Optionally restrict to specific stores
    storeIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Store",
      default: [],
    },
    // Priority: lower = evaluated first
    priority: {
      type: Number,
      default: 100,
    },
    // Top-level group tree (AND/OR/NOT nested)
    rootGroup: {
      type: eligibilityGroupSchema,
    },
    // Flat condition ids for easy querying
    conditionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    // Manual commercial approval gate
    requiresCommercialApproval: {
      type: Boolean,
      default: false,
    },
    commercialApprovalRule: {
      type: String,
      enum: ["sales_manager", "finance", "admin", "any"],
      default: "any",
    },
    // Roles that may approve
    allowedApproverRoles: {
      type: [String],
      default: [],
    },
// Versioning
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
    },
    // Commercial approval metadata
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    approvedAt: { type: Date, required: false },
    approvalNote: { type: String, required: false },
    // Audit
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
  },
  { timestamps: true }
);

// Indexes
planEligibilityRuleSchema.index({ planId: 1, status: 1, priority: 1 });
planEligibilityRuleSchema.index({ appliesTo: 1, status: 1 });
planEligibilityRuleSchema.index({ name: "text", description: "text" });

const PlanEligibilityRule = mongoose.model("PlanEligibilityRule", planEligibilityRuleSchema);
module.exports = PlanEligibilityRule;
