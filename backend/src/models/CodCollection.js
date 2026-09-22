const mongoose = require('mongoose');

const codCollectionSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
      index: true,
    },
    amountExpected: {
      type: Number,
      required: true,
      min: 0,
    },
    amountCollected: {
      type: Number,
      default: null,
      min: 0,
    },
    discrepancy: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'collected', 'remitted', 'discrepancy_flagged'],
      default: 'pending',
      index: true,
    },
    collectedAt: Date,
    remittedAt: Date,
    remittanceBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodRemittance',
      required: false,
    },
    notes: String,
  },
  { timestamps: true }
);

codCollectionSchema.pre('save', function() {
  if (this.amountCollected !== null && this.amountExpected) {
    this.discrepancy = this.amountCollected - this.amountExpected;
    if (this.discrepancy !== 0) {
      this.status = 'discrepancy_flagged';
    }
  }
});

module.exports = mongoose.model('CodCollection', codCollectionSchema);
