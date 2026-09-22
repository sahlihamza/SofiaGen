const mongoose = require('mongoose');
const { encrypt, decrypt, isEncrypted } = require('../../utils/encryption');

const paymentProviderSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logo: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: false,
      trim: true,
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
    sandboxConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    productionConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    mode: {
      type: String,
      enum: ['sandbox', 'production'],
      default: 'sandbox',
    },
    endpoint: {
      type: String,
      required: false,
      trim: true,
    },
    webhookUrl: {
      type: String,
      required: false,
      trim: true,
    },
    compatibleCountries: {
      type: [String],
      default: [],
    },
    compatibleCurrencies: {
      type: [String],
      default: [],
    },
    compatibleMethods: {
      type: [String],
      default: [],
    },
    supportsOneTime: {
      type: Boolean,
      default: true,
    },
    supportsOneTimePayment: {
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
    supportsCapture: {
      type: Boolean,
      default: false,
    },
    supportsAuthorization: {
      type: Boolean,
      default: false,
    },
    supportsDeferredPayment: {
      type: Boolean,
      default: false,
    },
    supportsWebhook: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'inactive',
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['gateway', 'manual'],
      default: 'gateway',
    },
    environment: {
      type: String,
      enum: ['sandbox', 'production'],
      default: 'sandbox',
    },
    display: {
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
    collection: 'payment_providers',
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        delete ret.apiKey;
        delete ret.secretKey;
        delete ret.webhookSecret;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        delete ret.apiKey;
        delete ret.secretKey;
        delete ret.webhookSecret;
        return ret;
      },
    },
  }
);

paymentProviderSchema.virtual('countries').get(function () {
  return this.compatibleCountries || [];
});

paymentProviderSchema.virtual('currencies').get(function () {
  return this.compatibleCurrencies || [];
});

paymentProviderSchema.virtual('isEnabled').get(function () {
  return Boolean(this.enabled);
});

paymentProviderSchema.index({ code: 1 }, { unique: true });
paymentProviderSchema.index({ status: 1 });
paymentProviderSchema.index({ enabled: 1 });
paymentProviderSchema.index({ type: 1 });

const encryptField = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  if (isEncrypted(value)) {
    return value;
  }
  return encrypt(value);
};

paymentProviderSchema.pre('save', function (next) {
  if (this.isModified('apiKey') && this.apiKey) {
    this.apiKey = encryptField(this.apiKey);
  }
  if (this.isModified('secretKey') && this.secretKey) {
    this.secretKey = encryptField(this.secretKey);
  }
  if (this.isModified('webhookSecret') && this.webhookSecret) {
    this.webhookSecret = encryptField(this.webhookSecret);
  }
  next();
});

paymentProviderSchema.methods.getApiKey = function () {
  return this.apiKey ? decrypt(this.apiKey) : undefined;
};

paymentProviderSchema.methods.getSecretKey = function () {
  return this.secretKey ? decrypt(this.secretKey) : undefined;
};

paymentProviderSchema.methods.getWebhookSecret = function () {
  return this.webhookSecret ? decrypt(this.webhookSecret) : undefined;
};

const PaymentProvider = mongoose.model('PaymentProvider', paymentProviderSchema);
module.exports = PaymentProvider;
