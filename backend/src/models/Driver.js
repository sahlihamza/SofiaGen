const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: false,
      index: true,
      validate: {
        validator: function() {
          // Must have storeId if not platform-scoped
          return this.platformScope || this.storeId;
        },
        message: 'Driver must have storeId or be platform-scoped',
      },
    },
    platformScope: {
      type: Boolean,
      default: false,
      index: true,
    },
    phone: {
      type: String,
      required: false,
    },
    vehicleType: {
      type: String,
      enum: ['motorcycle', 'car', 'van', 'truck', 'bicycle', 'pedestrian'],
      required: false,
    },
    vehiclePlate: {
      type: String,
      required: false,
    },
    zones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShippingZone',
      },
    ],
    status: {
      type: String,
      enum: ['available', 'busy', 'offline', 'suspended'],
      default: 'offline',
      index: true,
    },
    documents: [
      {
        type: {
          type: String,
          enum: ['license', 'insurance', 'registration', 'background_check'],
        },
        url: String,
        verifiedAt: Date,
        expiresAt: Date,
      },
    ],
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      lastUpdatedAt: Date,
    },
    performanceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    successfulDeliveries: {
      type: Number,
      default: 0,
    },
    failedDeliveries: {
      type: Number,
      default: 0,
    },
    suspensionReason: String,
    suspendedAt: Date,
  },
  { timestamps: true }
);

driverSchema.index({ currentLocation: '2dsphere' });

// Store scope isolation
if (require('../models/plugins/storeScoped')) {
  driverSchema.plugin(require('../models/plugins/storeScoped'), {
    scope: (doc) => {
      if (doc.platformScope) return null;
      return doc.storeId;
    },
  });
}

module.exports = mongoose.model('Driver', driverSchema);
