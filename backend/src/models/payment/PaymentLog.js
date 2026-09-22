const mongoose = require('mongoose');

const paymentLogSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug'],
      default: 'info',
    },
    actorType: {
      type: String,
      enum: ['platform_admin', 'store_owner', 'system'],
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: false,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentProvider',
      required: false,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: false,
    },
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentRefund',
      required: false,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'payment_logs',
    timestamps: true,
  }
);

paymentLogSchema.index({ module: 1, action: 1, createdAt: -1 });
paymentLogSchema.index({ actorId: 1, createdAt: -1 });
paymentLogSchema.index({ level: 1, createdAt: -1 });
paymentLogSchema.index({ createdAt: -1 });

paymentLogSchema.statics.log = async function log(data) {
  const { actorId, actorType, module, action, level, message, details, storeId, providerId, transactionId, refundId, ipAddress, userAgent, metadata } = data;
  return this.create({
    actorId: actorId || null,
    actorType: actorType || 'system',
    module: module || 'general',
    action: action || 'info',
    level: level || 'info',
    message: message || '',
    details: details || {},
    storeId: storeId || null,
    providerId: providerId || null,
    transactionId: transactionId || null,
    refundId: refundId || null,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    metadata: metadata || {},
  });
};

const PaymentLog = mongoose.model('PaymentLog', paymentLogSchema);
module.exports = PaymentLog;
