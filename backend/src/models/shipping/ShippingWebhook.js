const mongoose = require('mongoose');

/**
 * ShippingWebhook - Inbound webhook events from carriers
 * Enables idempotent processing (same eventId = already processed)
 */

const shippingWebhookSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true, // 'aramex', 'dhl', 'localcourier', etc.
      index: true,
    },
    // Unique provider event ID (enables idempotence)
    providerEventId: {
      type: String,
      required: true,
      sparse: true,
    },
    // Payload hash for detecting duplicates
    payloadHash: {
      type: String,
      default: null,
    },
    eventType: {
      type: String,
      default: 'shipment_status_update',
    },
    // Which shipment this affects
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      default: null,
      index: true,
    },
    // Raw webhook data from carrier
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Normalized event data
    normalizedData: {
      status: String,
      trackingNumber: String,
      timestamp: Date,
      location: String,
      notes: String,
    },
    // Processing status
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed', 'ignored'],
      default: 'pending',
      index: true,
    },
    // Processing result
    processedAt: {
      type: Date,
      default: null,
    },
    // Error details if failed
    error: {
      type: String,
      default: null,
    },
    // Attempt count
    attemptCount: {
      type: Number,
      default: 1,
    },
  },
  {
    collection: 'shipping_webhooks',
    timestamps: true,
  }
);

// Unique index: same eventId from same provider = idempotent
shippingWebhookSchema.index(
  { provider: 1, providerEventId: 1 },
  { sparse: true, unique: true }
);

shippingWebhookSchema.index({ storeId: 1, status: 1, createdAt: -1 });
shippingWebhookSchema.index({ shipmentId: 1, status: 1 });

const ShippingWebhook = mongoose.model('ShippingWebhook', shippingWebhookSchema);
module.exports = ShippingWebhook;
