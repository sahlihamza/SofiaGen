const mongoose = require('mongoose');

const storePaymentProviderMethodSchema = new mongoose.Schema(
  {
    storePaymentProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StorePaymentProvider',
      required: true,
      index: true,
    },
    methodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentMethod',
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'store_payment_provider_methods',
    timestamps: true,
  }
);

storePaymentProviderMethodSchema.index(
  { storePaymentProviderId: 1, methodId: 1 },
  { unique: true }
);
storePaymentProviderMethodSchema.index({ storePaymentProviderId: 1, enabled: 1, sortOrder: 1 });

const StorePaymentProviderMethod = mongoose.model(
  'StorePaymentProviderMethod',
  storePaymentProviderMethodSchema
);
module.exports = StorePaymentProviderMethod;
