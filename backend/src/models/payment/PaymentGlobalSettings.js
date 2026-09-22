const mongoose = require('mongoose');

const paymentGlobalSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'object', 'array'],
      required: true,
    },
    category: {
      type: String,
      enum: ['general', 'timeout', 'retry', 'logging', 'notification', 'alerts', 'security'],
      required: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    isEncrypted: {
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
    collection: 'payment_global_settings',
    timestamps: true,
  }
);

paymentGlobalSettingsSchema.index({ key: 1 }, { unique: true });
paymentGlobalSettingsSchema.index({ category: 1 });

const PaymentGlobalSettings = mongoose.model('PaymentGlobalSettings', paymentGlobalSettingsSchema);
module.exports = PaymentGlobalSettings;
