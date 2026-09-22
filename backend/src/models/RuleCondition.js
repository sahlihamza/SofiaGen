const mongoose = require("mongoose");

/**
 * RuleCondition  a single evaluable condition used by the no-code Rule Builder.
 *
 * A condition references a factor (e.g. orders, revenue, api_calls) and applies
 * an operator against a value. Conditions are grouped by RuleGroup (AND/OR/NOT).
 */
const ruleConditionSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrialRule",
      required: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RuleGroup",
      required: false,
      index: true,
    },
    factorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrialFactor",
      required: true,
    },
    factorCode: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    field: {
      type: String,
      required: false,
    },
    operator: {
      type: String,
      enum: [
        "equals",
        "notEquals",
        "greaterThan",
        "lessThan",
        "greaterThanOrEqual",
        "lessThanOrEqual",
        "between",
        "in",
        "notIn",
      ],
      required: true,
    },
    // String, Number, Boolean, Array ([min,max] for between, array for in/notIn)
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    negate: {
      type: Boolean,
      default: false, // enables NOT on a single condition
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

ruleConditionSchema.index({ ruleId: 1, groupId: 1, order: 1 });

const RuleCondition = mongoose.model("RuleCondition", ruleConditionSchema);
module.exports = RuleCondition;
