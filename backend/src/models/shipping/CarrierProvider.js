const mongoose = require('mongoose');
const { encrypt, decrypt, isEncrypted } = require('../../utils/encryption');

const carrierProviderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    logoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    brandColor: {
      type: String,
      default: '#000000',
      trim: true,
    },
    countriesCovered: {
      type: [String],
      default: [],
    },
    mode: {
      type: String,
      enum: ['sandbox', 'production'],
      default: 'sandbox',
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
    },
    webhookSecret: {
      type: String,
      select: false,
    },
    hasLabelGeneration: {
      type: Boolean,
      default: false,
    },
    hasTracking: {
      type: Boolean,
      default: true,
    },
    adapterKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isInternalFleet: {
      type: Boolean,
      default: false,
    },
    // SFG-155  per-carrier look of the printed bon de livraison. Every field
    // is optional: a provider without a template (internal fleet included)
    // falls back to the generic layout, which reuses `logoUrl`/`brandColor`
    // above and prints no routing line. Nothing about a carrier is hardcoded
    // in LabelGenerationService  it only reads what is configured here.
    labelTemplate: {
      // Overrides the provider logo/colour on the label only.
      logoUrl: { type: String, default: '', trim: true },
      brandColor: { type: String, default: '', trim: true },
      // Internal routing line the carrier prints between the two barcodes 
      // e.g. First Delivery's "Centrale >> ---- Dispatch ---- >> Centrale".
      routingText: { type: String, default: '', trim: true },
      // Free-text mention printed at the bottom of the label (legal notice,
      // hotline, return policy...).
      footerNote: { type: String, default: '', trim: true },
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
    collection: 'carrier_providers',
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        delete ret.webhookSecret;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        delete ret.webhookSecret;
        return ret;
      },
    },
  }
);

carrierProviderSchema.index({ adapterKey: 1 });
carrierProviderSchema.index({ isActive: 1 });
carrierProviderSchema.index({ isInternalFleet: 1 });

const encryptField = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  if (isEncrypted(value)) {
    return value;
  }
  return encrypt(value);
};

carrierProviderSchema.pre('save', function (next) {
  if (this.isModified('webhookSecret') && this.webhookSecret) {
    this.webhookSecret = encryptField(this.webhookSecret);
  }
  next();
});

carrierProviderSchema.methods.getWebhookSecret = function () {
  return this.webhookSecret ? decrypt(this.webhookSecret) : undefined;
};

const CarrierProvider = mongoose.model('CarrierProvider', carrierProviderSchema);
module.exports = CarrierProvider;
