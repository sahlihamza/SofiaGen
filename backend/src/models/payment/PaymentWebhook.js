const mongoose = require('mongoose');

const paymentWebhookSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentProvider',
      required: true,
    },
    event: {
      type: String,
      required: true,
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    headers: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    signature: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['received', 'processed', 'failed', 'retrying'],
      default: 'received',
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: false,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    nextRetryAt: {
      type: Date,
      required: false,
    },
    processedAt: {
      type: Date,
      required: false,
    },
    errorMessage: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
  },
  {
    collection: 'payment_webhooks',
    timestamps: true,
  }
);

paymentWebhookSchema.index({ providerId: 1, createdAt: -1 });
paymentWebhookSchema.index({ transactionId: 1 });
paymentWebhookSchema.index({ status: 1 });
paymentWebhookSchema.index({ event: 1 });

const PaymentWebhook = mongoose.model('PaymentWebhook', paymentWebhookSchema);
module.exports = PaymentWebhook;
