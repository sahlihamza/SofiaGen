const mongoose = require('mongoose');

const paymentMethodProviderLinkSchema = new mongoose.Schema(
  {
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentMethod',
      required: true,
    },
    paymentProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentProvider',
      required: true,
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
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'payment_method_provider_links',
    timestamps: true,
  }
);

paymentMethodProviderLinkSchema.index(
  { paymentMethodId: 1, paymentProviderId: 1 },
  { unique: true }
);
paymentMethodProviderLinkSchema.index({ status: 1 });

const PaymentMethodProviderLink = mongoose.model(
  'PaymentMethodProviderLink',
  paymentMethodProviderLinkSchema
);
module.exports = PaymentMethodProviderLink;
