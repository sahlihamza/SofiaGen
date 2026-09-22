const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    name: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    description: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    type: {
      type: String,
      enum: ['online', 'offline'],
      default: 'online',
    },
    icon: {
      type: String,
      default: '',
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    compatibleCountries: {
      type: [String],
      default: [],
    },
    compatibleCurrencies: {
      type: [String],
      default: [],
    },
    compatiblePlans: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Plan',
      default: [],
    },
    minAmount: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    maxAmount: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    additionalFees: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    supportsRefund: {
      type: Boolean,
      default: false,
    },
    supportsPartialPayment: {
      type: Boolean,
      default: false,
    },
    supportsSubscription: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    collection: 'payment_methods',
    timestamps: true,
  }
);

paymentMethodSchema.index({ code: 1 }, { unique: true });
paymentMethodSchema.index({ status: 1 });
paymentMethodSchema.index({ displayOrder: 1 });

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);
module.exports = PaymentMethod;
