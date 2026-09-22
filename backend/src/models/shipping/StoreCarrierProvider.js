const mongoose = require('mongoose');
const { encrypt, decrypt, isEncrypted } = require('../../utils/encryption');

const ENCRYPTED_FIELDS = ['apiKey', 'secretKey', 'accountNumber'];

const maskSecret = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  const plain = value.length > 4 ? value.slice(-4) : value;
  return `****${plain}`;
};

const storeCarrierProviderSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    carrierProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarrierProvider',
      required: true,
    },
    credentials: {
      apiKey: { type: String, select: false },
      secretKey: { type: String, select: false },
      accountNumber: { type: String, select: false },
      custom: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    hasLabelGeneration: {
      type: Boolean,
      default: false,
    },
    hasTracking: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
    collection: 'store_carrier_providers',
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        ENCRYPTED_FIELDS.forEach((field) => {
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

storeCarrierProviderSchema.index({ storeId: 1, carrierProviderId: 1 }, { unique: true });
storeCarrierProviderSchema.index({ storeId: 1, isActive: 1 });

const encryptField = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  if (isEncrypted(value)) {
    return value;
  }
  return encrypt(value);
};

storeCarrierProviderSchema.pre('save', function (next) {
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
  storeCarrierProviderSchema.methods[`get${capitalizedField}`] = function () {
    return this.credentials[field] ? decrypt(this.credentials[field]) : undefined;
  };
});

const StoreCarrierProvider = mongoose.model('StoreCarrierProvider', storeCarrierProviderSchema);
module.exports = StoreCarrierProvider;
