const mongoose = require('mongoose');
const { encrypt, decrypt, isEncrypted } = require('../../utils/encryption');

const ENCRYPTED_FIELDS = [
  "apiKey",
  "secretKey",
  "webhookSecret",
  "sandboxApiKey",
  "sandboxSecretKey",
  "sandboxWebhookSecret",
  "productionApiKey",
  "productionSecretKey",
  "productionWebhookSecret",
];

const maskSecret = (value) => {
  if (!value || typeof value !== "string") {
    return value;
  }
  const plain = value.length > 4 ? value.slice(-4) : value;
  return `****${plain}`;
};

const paymentProviderConfigurationSchema = new mongoose.Schema(
  {
    paymentProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentProvider',
      required: true,
      unique: true,
    },
    apiKey: {
      type: String,
      select: false,
    },
    secretKey: {
      type: String,
      select: false,
    },
    webhookSecret: {
      type: String,
      select: false,
    },
    webhookUrl: {
      type: String,
      required: false,
      trim: true,
    },
    timeout: {
      type: Number,
      default: 30000,
    },
    retryCount: {
      type: Number,
      default: 3,
    },
    retryDelay: {
      type: Number,
      default: 1000,
    },
    environment: {
      type: String,
      enum: ['sandbox', 'production'],
      default: 'sandbox',
    },
    sandboxApiKey: {
      type: String,
      select: false,
    },
    sandboxSecretKey: {
      type: String,
      select: false,
    },
    sandboxWebhookSecret: {
      type: String,
      select: false,
    },
    productionApiKey: {
      type: String,
      select: false,
    },
    productionSecretKey: {
      type: String,
      select: false,
    },
    productionWebhookSecret: {
      type: String,
      select: false,
    },
    keyRotationEnabled: {
      type: Boolean,
      default: false,
    },
    lastKeyRotation: {
      type: Date,
      required: false,
    },
    nextKeyRotation: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'inactive',
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    testResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
    collection: 'payment_provider_configurations',
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        ENCRYPTED_FIELDS.forEach((field) => {
          if (ret[field]) {
            try {
              ret[field] = maskSecret(decrypt(ret[field]));
            } catch (error) {
              ret[field] = "****";
            }
          }
        });
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.__v;
        ENCRYPTED_FIELDS.forEach((field) => {
          if (ret[field]) {
            try {
              ret[field] = maskSecret(decrypt(ret[field]));
            } catch (error) {
              ret[field] = "****";
            }
          }
        });
        return ret;
      },
    },
  }
);

paymentProviderConfigurationSchema.index({ paymentProviderId: 1 }, { unique: true });
paymentProviderConfigurationSchema.index({ status: 1 });

const encryptField = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  if (isEncrypted(value)) {
    return value;
  }
  return encrypt(value);
};

paymentProviderConfigurationSchema.pre("save", function (next) {
  ENCRYPTED_FIELDS.forEach((field) => {
    if (this.isModified(field) && this[field]) {
      this[field] = encryptField(this[field]);
    }
  });
  next();
});

ENCRYPTED_FIELDS.forEach((field) => {
  const capitalizedField = field.replace(/^./, (c) => c.toUpperCase());
  paymentProviderConfigurationSchema.methods[`get${capitalizedField}`] = function () {
    return this[field] ? decrypt(this[field]) : undefined;
  };
});

const PaymentProviderConfiguration = mongoose.model('PaymentProviderConfiguration', paymentProviderConfigurationSchema);
module.exports = PaymentProviderConfiguration;
