const mongoose = require("mongoose");

/**
 * TrialRule  the entry point of the dynamic Trial Engine.
 *
 * Replaces the hard-coded `plan.pricing.trialDays` logic. A rule is a set of
 * nested groups of conditions (AND/OR/NOT) that, when satisfied, triggers a set
 * of actions (RuleAction). Super admin builds rules without code.
 *
 * Example (no-code):
 *   TRIAL for 14 days
 *   OR (orders >= 100)
 *   OR (products >= 100)
 *   OR (revenue >= 500)
 *   OR (api_calls >= 1000)
 */
const ruleGroupSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // client-generated id for tree
    logicOperator: {
      type: String,
      enum: ["AND", "OR", "NOT"],
      default: "AND",
    },
    // Child groups (nested)  recursive reference to the same schema
    children: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    conditionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "RuleCondition",
      default: [],
    },
  },
  { _id: false }
);

const trialRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    // Scope: which resources this rule applies to
    appliesTo: {
      type: String,
      enum: ["all", "new_stores", "existing_stores", "specific_plans", "specific_stores"],
      default: "new_stores",
    },
    planIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Plan",
      default: [],
    },
    // Priority: lower number = evaluated first
    priority: {
      type: Number,
      default: 100,
    },
    // Top-level group tree (AND/OR/NOT with nested groups)
    rootGroup: {
      type: ruleGroupSchema,
      required: false,
    },
    // Companion conditions kept flat too for easy queries (optional)
    conditionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "RuleCondition",
      default: [],
    },
    // Versioning of the rule
    version: {
      type: Number,
      default: 1,
    },
    // Enabled toggle
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

trialRuleSchema.index({ status: 1, priority: 1 });
trialRuleSchema.index({ appliesTo: 1, status: 1 });
trialRuleSchema.index({ name: "text", description: "text" });

const TrialRule = mongoose.model("TrialRule", trialRuleSchema);
module.exports = TrialRule;
