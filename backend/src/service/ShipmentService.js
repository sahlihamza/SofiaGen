const Shipment = require('../models/shipping/Shipment');
const Order = require('../models/Order');
const StoreCarrierProvider = require('../models/shipping/StoreCarrierProvider');
const CarrierProvider = require('../models/shipping/CarrierProvider');
const ProofOfDelivery = require('../models/ProofOfDelivery');
const AramexAdapter = require('../adapters/shipping/AramexAdapter');
const LocalCourierAdapter = require('../adapters/shipping/LocalCourierAdapter');
const InternalFleetAdapter = require('../adapters/shipping/InternalFleetAdapter');
const logger = require('../config/logger');
const { eventBus } = require('../lib/eventBus');

/**
 * ShipmentService - Manages shipment lifecycle
 * - Create shipments via carrier adapters
 * - Track status via webhooks
 * - Support manual tracking entry
 * - Idempotent webhook processing
 */

class ShipmentService {
  /**
   * Get or instantiate carrier adapter
   */
  static async getAdapter(carrierProvider, storeCarrier) {
    const adapterKey = carrierProvider.adapterKey;

    switch (adapterKey) {
      case 'aramex':
        return new AramexAdapter(carrierProvider, storeCarrier);
      case 'localcourier':
        return new LocalCourierAdapter(carrierProvider, storeCarrier);
      case 'internal_fleet':
        return new InternalFleetAdapter(carrierProvider, storeCarrier);
      default:
        throw new Error(`Unknown carrier adapter: ${adapterKey}`);
    }
  }

  /**
   * Create shipment via carrier API
   * Returns REAL shipment data from provider (never generates locally)
   */
  static async createShipment(orderId, storeCarrierId, shipFromAddress) {
    // Validate order exists
    const order = await Order.findById(orderId).populate('storeId');
    if (!order) throw new Error('Order not found');

    // Validate carrier is connected and active
    const storeCarrier = await StoreCarrierProvider.findOne({
      _id: storeCarrierId,
      storeId: order.storeId,
      isActive: true,
    }).select('+credentials');

    if (!storeCarrier) {
      throw new Error('Carrier not found or inactive for this store');
    }

    // Get carrier provider config
    const carrierProvider = await CarrierProvider.findById(storeCarrier.carrierProviderId);
    if (!carrierProvider) throw new Error('Carrier provider not found');

    // Check if carrier supports API-based shipment creation
    if (!carrierProvider.metadata?.hasLabelGeneration && carrierProvider.adapterKey !== 'localcourier') {
      const error = new Error('This carrier does not support API-based label creation');
      error.code = 'MANUAL_SHIPMENT_REQUIRED';
      throw error;
    }

    try {
      // Get adapter and call createShipment
      const adapter = await this.getAdapter(carrierProvider, storeCarrier);
      const shipmentData = await adapter.createShipment(order, shipFromAddress);

      // Create Shipment in database with REAL provider data
      const shipment = await Shipment.create({
        orderId: order._id,
        storeId: order.storeId,
        carrierProviderId: storeCarrier._id,
        status: 'label_created',
        trackingNumber: shipmentData.trackingNumber,
        labelUrl: shipmentData.labelUrl,
        providerShipmentId: shipmentData.providerShipmentId,
        carrierPayload: shipmentData.payload,
        events: [
          {
            status: 'label_created',
            timestamp: new Date(),
            note: `Shipment created via ${carrierProvider.name}`,
            source: 'system',
          },
        ],
        metadata: {
          carrierName: carrierProvider.name,
          estimatedDelivery: shipmentData.estimatedDelivery,
        },
      });

      logger.info(`Shipment created: ${shipment._id} for order ${order.orderNumber}`);
      return shipment;
    } catch (err) {
      logger.error(`createShipment failed for order ${orderId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Create shipment with manual tracking number
   * For carriers without API access
   */
  static async createManualShipment(orderId, storeCarrierId, trackingNumber, shipFromAddress) {
    const order = await Order.findById(orderId).populate('storeId');
    if (!order) throw new Error('Order not found');

    if (!trackingNumber || trackingNumber.trim() === '') {
      throw new Error('Tracking number is required');
    }

    const storeCarrier = await StoreCarrierProvider.findOne({
      _id: storeCarrierId,
      storeId: order.storeId,
      isActive: true,
    });

    if (!storeCarrier) throw new Error('Carrier not found or inactive');

    const carrierProvider = await CarrierProvider.findById(storeCarrier.carrierProviderId);
    if (!carrierProvider) throw new Error('Carrier provider not found');

    // Check if manual creation is allowed
    if (!carrierProvider.metadata?.allowManualCreation) {
      throw new Error('This carrier does not support manual shipment creation');
    }

    const shipment = await Shipment.create({
      orderId: order._id,
      storeId: order.storeId,
      carrierProviderId: storeCarrier._id,
      status: 'picked_up',
      trackingNumber,
      labelUrl: null,
      providerShipmentId: null,
      carrierPayload: { manual: true },
      events: [
        {
          status: 'picked_up',
          timestamp: new Date(),
          note: `Manual shipment entry: ${trackingNumber}`,
          source: 'manual',
        },
      ],
      metadata: {
        carrierName: carrierProvider.name,
        manual: true,
      },
      createdBy: shipFromAddress?.userId, // Can pass userId if available
    });

    logger.info(`Manual shipment created: ${shipment._id}, tracking: ${trackingNumber}`);
    return shipment;
  }

  /**
   * Get shipment status
   */
  static async getShipment(shipmentId, storeId) {
    const shipment = await Shipment.findOne({
      _id: shipmentId,
      storeId,
    });

    if (!shipment) throw new Error('Shipment not found');
    return shipment;
  }

  /**
   * Update shipment via webhook
   * Idempotent: same eventId never creates multiple state transitions
   */
  static async updateShipmentFromWebhook(shipmentId, webhookEventId, normalizedEvent) {
    // Find shipment
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new Error('Shipment not found');

    // Idempotence check: prevent duplicate event processing
    const existingEvent = shipment.events?.find((e) => e.webhookEventId === webhookEventId);
    if (existingEvent) {
      logger.warn(`Duplicate webhook eventId ${webhookEventId} for shipment ${shipmentId} - ignoring`);
      return shipment; // Return existing, don't process again
    }

    // Validate state transition
    const newStatus = normalizedEvent.status;
    if (!this._isValidTransition(shipment.status, newStatus)) {
      logger.warn(`Invalid state transition for shipment ${shipmentId}: ${shipment.status}  ${newStatus}`);
      return shipment; // Don't update invalid transitions
    }

    // Strict validation for internal fleet: must have ProofOfDelivery before delivered
    if (newStatus === 'delivered') {
      const storeCarrier = await StoreCarrierProvider.findById(shipment.carrierProviderId);
      const carrierProvider = await CarrierProvider.findById(storeCarrier?.carrierProviderId);

      if (carrierProvider?.adapterKey === 'internal_fleet') {
        const pod = await ProofOfDelivery.findOne({ shipmentId });
        if (!pod) {
          logger.error(`Cannot mark internal fleet shipment ${shipmentId} as delivered without ProofOfDelivery`);
          throw new Error('ProofOfDelivery required for internal fleet delivery');
        }
      }
    }

    // Update shipment status and add event
    shipment.status = newStatus;
    shipment.events.push({
      status: newStatus,
      timestamp: new Date(normalizedEvent.data?.timestamp || new Date()),
      note: normalizedEvent.data?.notes || normalizedEvent.data?.message || '',
      source: 'webhook',
      webhookEventId, // Track for idempotence
    });

    await shipment.save();

    logger.info(`Shipment ${shipmentId} updated via webhook: ${shipment.status}`);

    // Emit notification event
    try {
      const order = await Order.findById(shipment.orderId);
      eventBus.emit(`shipment.${shipment.status}`, {
        shipmentId: shipment._id,
        orderId: shipment.orderId,
        storeId: shipment.storeId,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        customerId: order?.customerId,
        metadata: { source: 'webhook' },
      });
    } catch (err) {
      logger.warn(`Failed to emit shipment event: ${err.message}`);
    }

    return shipment;
  }

  /**
   * Validate shipment state transitions
   * Defines valid state machine for shipments
   */
  static _isValidTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus) return true; // Allow same status (idempotence)

    const validTransitions = {
      pending: ['label_created', 'cancelled'],
      label_created: ['picked_up', 'cancelled'],
      picked_up: ['in_transit', 'cancelled'],
      in_transit: ['out_for_delivery', 'failed_delivery', 'returned'],
      out_for_delivery: ['delivered', 'failed_delivery', 'returned'],
      delivered: [],
      failed_delivery: ['returned', 'cancelled'],
      returned: [],
      cancelled: [],
    };

    return validTransitions[fromStatus]?.includes(toStatus) ?? false;
  }

  /**
   * Get label for shipment
   */
  static async getLabel(shipmentId, storeId) {
    const shipment = await Shipment.findOne({ _id: shipmentId, storeId });
    if (!shipment) throw new Error('Shipment not found');

    if (shipment.labelUrl) {
      return { labelUrl: shipment.labelUrl, source: 'cached' };
    }

    // Fetch from carrier if not cached
    if (!shipment.providerShipmentId) {
      throw new Error('No label available for this shipment');
    }

    try {
      const storeCarrier = await StoreCarrierProvider.findById(shipment.carrierProviderId).select('+credentials');
      const carrierProvider = await CarrierProvider.findById(storeCarrier.carrierProviderId);

      if (!carrierProvider.metadata?.hasLabelGeneration) {
        throw new Error('Carrier does not support label generation');
      }

      const adapter = await this.getAdapter(carrierProvider, storeCarrier);
      const labelData = await adapter.getLabel(shipment.providerShipmentId);

      // Cache label URL
      shipment.labelUrl = labelData.labelUrl;
      await shipment.save();

      return { labelUrl: labelData.labelUrl, source: 'provider' };
    } catch (err) {
      logger.error(`Failed to fetch label for shipment ${shipmentId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Cancel shipment
   */
  static async cancelShipment(shipmentId, storeId) {
    const shipment = await Shipment.findOne({ _id: shipmentId, storeId });
    if (!shipment) throw new Error('Shipment not found');

    if (shipment.status === 'cancelled') {
      return shipment; // Already cancelled
    }

    if (!['pending', 'label_created'].includes(shipment.status)) {
      throw new Error(`Cannot cancel shipment in ${shipment.status} status`);
    }

    try {
      if (shipment.providerShipmentId) {
        const storeCarrier = await StoreCarrierProvider.findById(shipment.carrierProviderId);
        const carrierProvider = await CarrierProvider.findById(storeCarrier.carrierProviderId);

        const adapter = await this.getAdapter(carrierProvider, storeCarrier);
        await adapter.cancelShipment(shipment.providerShipmentId);
      }

      shipment.status = 'cancelled';
      shipment.events.push({
        status: 'cancelled',
        timestamp: new Date(),
        note: 'Shipment cancelled by admin',
        source: 'manual',
      });

      await shipment.save();
      logger.info(`Shipment ${shipmentId} cancelled`);

      // Emit notification event
      try {
        const order = await Order.findById(shipment.orderId);
        eventBus.emit(`shipment.${shipment.status}`, {
          shipmentId: shipment._id,
          orderId: shipment.orderId,
          storeId: shipment.storeId,
          trackingNumber: shipment.trackingNumber,
          status: shipment.status,
          customerId: order?.customerId,
          metadata: { source: 'manual' },
        });
      } catch (err) {
        logger.warn(`Failed to emit shipment event: ${err.message}`);
      }

      return shipment;
    } catch (err) {
      logger.error(`Failed to cancel shipment ${shipmentId}: ${err.message}`);
      throw err;
    }
  }
}

module.exports = ShipmentService;
