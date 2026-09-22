const mongoose = require('mongoose');

const paymentRefundSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
    },
    reason: {
      type: String,
      required: false,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    providerRefundId: {
      type: String,
      required: false,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    rejectionReason: {
      type: String,
      required: false,
      trim: true,
    },
    processedAt: {
      type: Date,
      required: false,
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
    collection: 'payment_refunds',
    timestamps: true,
  }
);

paymentRefundSchema.index({ transactionId: 1 });
paymentRefundSchema.index({ paymentId: 1 });
paymentRefundSchema.index({ status: 1 });
paymentRefundSchema.index({ requestedBy: 1 });
paymentRefundSchema.index({ createdAt: -1 });

const PaymentRefund = mongoose.model('PaymentRefund', paymentRefundSchema);
module.exports = PaymentRefund;
