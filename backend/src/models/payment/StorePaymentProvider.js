const mongoose = require('mongoose');
const { encrypt, decrypt, isEncrypted } = require('../../utils/encryption');

const ENCRYPTED_FIELDS = [
  'apiKey',
  'secretKey',
  'webhookSecret',
  'clientId',
  'clientSecret',
  'appToken',
  'appSecret',
  'merchantId',
  'terminalId',
  'password',
];

const maskSecret = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  const plain = value.length > 4 ? value.slice(-4) : value;
  return `****${plain}`;
};

const storePaymentProviderSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentProvider',
      required: true,
    },
    enabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    credentials: {
      apiKey: { type: String, select: false },
      secretKey: { type: String, select: false },
      webhookSecret: { type: String, select: false },
      clientId: { type: String, select: false },
      clientSecret: { type: String, select: false },
      appToken: { type: String, select: false },
      appSecret: { type: String, select: false },
      merchantId: { type: String, select: false },
      terminalId: { type: String, select: false },
      password: { type: String, select: false },
      custom: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    settings: {
      testMode: { type: Boolean, default: false },
      webhookUrl: { type: String, trim: true },
      timeout: { type: Number, default: 30000 },
      retryCount: { type: Number, default: 3 },
      retryDelay: { type: Number, default: 1000 },
      custom: { type: mongoose.Schema.Types.Mixed, default: {} },
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
    collection: 'store_payment_providers',
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        ENCRYPTED_FIELDS.forEach((field) => {
          const path = `credentials.${field}`;
          if (ret.credentials && ret.credentials[field]) {
            try {
              ret.credentials[field] = maskSecret(decrypt(ret.credentials[field]));
            } catch (error) {
              ret.credentials[field] = '****';
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
          const path = `credentials.${field}`;
          if (ret.credentials && ret.credentials[field]) {
            try {
              ret.credentials[field] = maskSecret(decrypt(ret.credentials[field]));
            } catch (error) {
              ret.credentials[field] = '****';
            }
          }
        });
        return ret;
      },
    },
  }
);

storePaymentProviderSchema.index({ storeId: 1, providerId: 1 }, { unique: true });
storePaymentProviderSchema.index({ storeId: 1, enabled: 1 });

const encryptField = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  if (isEncrypted(value)) {
    return value;
  }
  return encrypt(value);
};

storePaymentProviderSchema.pre('save', function (next) {
  ENCRYPTED_FIELDS.forEach((field) => {
    const path = `credentials.${field}`;
    if (this.isModified(path) && this.credentials[field]) {
      this.credentials[field] = encryptField(this.credentials[field]);
    }
  });
  next();
});

ENCRYPTED_FIELDS.forEach((field) => {
  const capitalizedField = field.replace(/^./, (c) => c.toUpperCase());
  storePaymentProviderSchema.methods[`get${capitalizedField}`] = function () {
    return this.credentials[field] ? decrypt(this.credentials[field]) : undefined;
  };
});

storePaymentProviderSchema.methods.getPublicCredentials = function () {
  const publicFields = ['clientId', 'merchantId', 'terminalId'];
  const result = {};
  publicFields.forEach((field) => {
    if (this.credentials[field]) {
      result[field] = this.credentials[field];
    }
  });
  return result;
};

const StorePaymentProvider = mongoose.model('StorePaymentProvider', storePaymentProviderSchema);
module.exports = StorePaymentProvider;
