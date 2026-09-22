const mongoose = require('mongoose');

const proofOfDeliverySchema = new mongoose.Schema(
  {
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true,
      unique: true,
    },
    method: {
      type: String,
      enum: ['signature', 'photo', 'otp'],
      required: true,
    },
    signatureUrl: String,
    photoUrl: String,
    otpCode: String,
    receivedByName: String,
    gpsLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: false,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: false,
      index: true,
    },
    notes: String,
  },
  { timestamps: true }
);

proofOfDeliverySchema.index({ gpsLocation: '2dsphere' });

module.exports = mongoose.model('ProofOfDelivery', proofOfDeliverySchema);
