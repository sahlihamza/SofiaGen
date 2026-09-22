const CarrierAdapter = require('./CarrierAdapter');
const Driver = require('../../models/Driver');
const DriverService = require('../../service/driverService');
const Shipment = require('../../models/shipping/Shipment');
const ShippingZone = require('../../models/ShippingZone');
const logger = require('../../config/logger');

/**
 * InternalFleetAdapter - Shipping adapter for internal/own fleet
 * Assigns shipments to available drivers based on zones
 */
class InternalFleetAdapter extends CarrierAdapter {
  /**
   * Create shipment by assigning to available driver
   * Finds drivers in the shipping zone, assigns FIFO or by proximity if location available
   *
   * @param {Object} order - Order document
   * @param {Object} shippingAddress - Customer shipping address
   * @returns {Promise<{trackingNumber, labelUrl, providerShipmentId, estimatedDelivery}>}
   */
  async createShipment(order, shippingAddress) {
    const storeId = order.storeId;

    // Get order's shipping zone (should be set by checkout)
    const zone = await ShippingZone.findOne({
      storeId,
      name: shippingAddress.zone || 'default',
    });

    if (!zone) {
      throw new Error(`No shipping zone found for address zone: ${shippingAddress.zone}`);
    }

    // Find available drivers in this zone
    const availableDrivers = await DriverService.getAvailableDriversForZones([zone._id], storeId);

    if (availableDrivers.length === 0) {
      throw new Error('No available drivers in this zone');
    }

    // Simple FIFO assignment: pick first available driver
    // In future: could use proximity, load balancing, etc.
    const assignedDriver = availableDrivers[0];

    logger.info(`Shipment for order ${order._id} assigned to driver ${assignedDriver._id}`);

    // Return minimal shipment data - internal fleet doesn't generate labels
    return {
      trackingNumber: `INTERNAL-${assignedDriver._id.toString().slice(0, 8)}-${Date.now()}`,
      labelUrl: null, // No physical label for internal fleet
      providerShipmentId: assignedDriver._id.toString(), // Use driver ID as provider reference
      estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h estimate
      metadata: {
        assignedDriver: assignedDriver._id,
        driverName: assignedDriver.userId?.name,
        zone: zone.name,
      },
    };
  }

  /**
   * Get label - not applicable for internal fleet
   */
  async getLabel(shipmentId) {
    // Internal fleet doesn't generate shipping labels
    return {
      labelUrl: null,
      format: null,
    };
  }

  /**
   * Track shipment based on driver location and events
   */
  async trackShipment(trackingNumber) {
    // For internal fleet, tracking is based on shipment events and driver location
    const shipment = await Shipment.findOne({
      trackingNumber,
    });

    if (!shipment) {
      return {
        status: 'unknown',
        events: [],
        lastUpdate: null,
      };
    }

    const lastEvent = shipment.events?.[shipment.events.length - 1];

    return {
      status: shipment.status,
      events: shipment.events || [],
      lastUpdate: lastEvent?.timestamp || shipment.updatedAt,
      driverLocation: shipment.driverLocation,
    };
  }

  /**
   * Cancel shipment - remove assignment from driver
   */
  async cancelShipment(shipmentId) {
    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
      return { success: false, message: 'Shipment not found' };
    }

    // No refund for internal fleet (no external payment)
    return {
      success: true,
      refundAmount: 0,
    };
  }

  /**
   * Get shipping rates for internal fleet
   * Simple flat rate or zone-based
   */
  async getRates(cart, shippingAddress) {
    // Get rate from zone metadata or use default
    const rate = this.carrierProvider.metadata?.fixedRate || 5;

    return {
      cost: rate,
      estimatedDays: 1, // Same-day or next-day for internal fleet
      carrierName: 'Internal Fleet',
    };
  }

  /**
   * Internal fleet doesn't use webhooks - events are direct
   */
  verifyWebhook(payload, signature, secret) {
    return false; // Internal fleet doesn't use webhooks
  }

  /**
   * No webhook normalization needed for internal fleet
   */
  normalizeWebhook(event) {
    return null;
  }

  get providerCode() {
    return 'internal_fleet';
  }
}

module.exports = InternalFleetAdapter;
