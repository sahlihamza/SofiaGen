const mongoose = require('mongoose');

/**
 * CarrierAdapter Interface (Phase 5)
 * ===================================
 * Each CarrierProvider has a corresponding CarrierAdapter implementing:
 *
 * class CarrierAdapter {
 *   // Create shipment label and tracking
 *   async createShipment(order, storeCarrierConfig) {
 *     // Returns: { trackingNumber, labelUrl, providerShipmentId, payload: {...} }
 *   }
 *
 *   // Retrieve existing label
 *   async getLabel(shipmentId) {
 *     // Returns: { labelUrl, format: 'pdf'|'zpl'|... }
 *   }
 *
 *   // Track shipment status updates
 *   async trackShipment(trackingNumber) {
 *     // Returns: { status, events: [...], lastUpdate: Date }
 *   }
 *
 *   // Cancel/refund shipment
 *   async cancelShipment(shipmentId) {
 *     // Returns: { success: true, refundAmount?: number }
 *   }
 *
 *   // Get shipping rates before checkout
 *   async getRates(cart, shippingAddress) {
 *     // Returns: [{ name, cost, days, options: {...} }, ...]
 *   }
 * }
 */

const shipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    carrierProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreCarrierProvider',
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'label_created',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed_delivery',
        'returned',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },
    trackingNumber: {
      type: String,
      default: null,
    },
    labelUrl: {
      type: String,
      default: null,
    },
    providerShipmentId: {
      type: String,
      default: null,
    },
    carrierPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    events: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
        source: {
          type: String,
          enum: ['webhook', 'manual', 'system'],
          default: 'system',
        },
      },
    ],
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
    collection: 'shipments',
    timestamps: true,
  }
);

shipmentSchema.index({ storeId: 1, status: 1 });
shipmentSchema.index({ orderId: 1 });
shipmentSchema.index({ trackingNumber: 1 });
shipmentSchema.index({ carrierProviderId: 1 });

const Shipment = mongoose.model('Shipment', shipmentSchema);
module.exports = Shipment;
