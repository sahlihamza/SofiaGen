const mongoose = require('mongoose');

const paymentRuleSchema = new mongoose.Schema(
  {
    paymentProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentProvider',
      required: true,
    },
    countries: {
      type: [String],
      default: [],
    },
    currencies: {
      type: [String],
      default: [],
    },
    planIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Plan',
      default: [],
    },
    storeTypes: {
      type: [String],
      default: [],
    },
    clientTypes: {
      type: [String],
      default: [],
    },
    minAmount: {
      type: Number,
      required: false,
    },
    maxAmount: {
      type: Number,
      required: false,
    },
    supportsOneTime: {
      type: Boolean,
      default: true,
    },
    supportsSubscription: {
      type: Boolean,
      default: false,
    },
    supportsRefund: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'payment_rules',
    timestamps: true,
  }
);

paymentRuleSchema.index({ paymentProviderId: 1 });
paymentRuleSchema.index({ status: 1 });

const PaymentRule = mongoose.model('PaymentRule', paymentRuleSchema);
module.exports = PaymentRule;
