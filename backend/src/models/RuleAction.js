const mongoose = require("mongoose");

/**
 * RuleAction  what happens when a rule (set of conditions) evaluates to true.
 *
 * Per cahier des charges:
 *   - end_trial
 *   - suspend_store
 *   - read_only
 *   - create_invoice
 *   - notify
 *   - webhook
 *   - grace_period
 *   - downgrade
 *   - archive
 *   - custom_action
 */
const ruleActionSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrialRule",
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: [
        "end_trial",
        "suspend_store",
        "read_only",
        "create_invoice",
        "notify",
        "webhook",
        "grace_period",
        "downgrade",
        "archive",
        "custom_action",
      ],
      required: true,
    },
    label: {
      type: String,
      required: false,
    },
    // Action-specific configuration
    config: {
      // For notify
      notificationChannel: { type: String, enum: ["email", "sms", "in_app", null], default: null },
      notificationTemplate: { type: String, required: false },
      // For webhook
      webhookUrl: { type: String, required: false },
      // For grace_period
      graceDays: { type: Number, required: false },
      // For create_invoice
      invoiceTemplate: { type: String, required: false },
      // For downgrade
      targetPlanCode: { type: String, required: false },
      // For custom_action
      customCode: { type: String, required: false },
      customPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

ruleActionSchema.index({ ruleId: 1, order: 1 });

const RuleAction = mongoose.model("RuleAction", ruleActionSchema);
module.exports = RuleAction;
