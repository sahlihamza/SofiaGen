const axios = require('axios');
const crypto = require('crypto');
const CarrierAdapter = require('./CarrierAdapter');

/**
 * LocalCourierAdapter - Generic webhook-based courier integration
 *
 * Designed for local/regional couriers without dedicated API.
 * Supports:
 * - Manual shipment creation (admin enters tracking number)
 * - Webhook-based status updates (courier posts to /webhooks/shipping)
 * - Configurable webhook payload format via metadata
 *
 * Usage: Store Admin configures in CarrierProvider:
 *   - webhookSecret: signature verification key
 *   - webhookUrl: (auto-generated) https://store.app/webhooks/shipping/localcourier
 *   - metadata.webhookFormat: 'json'|'form' (how courier sends data)
 */

class LocalCourierAdapter extends CarrierAdapter {
  get providerCode() {
    return 'localcourier';
  }

  /**
   * Local couriers don't create shipments via API
   * Instead: Store Admin enters tracking number manually
   * This method is called via manual form submission
   */
  async createShipment(order, shippingAddress) {
    // Check if carrier allows manual creation
    if (!this.carrierProvider?.metadata?.allowManualCreation) {
      throw new Error('This courier requires manual tracking number entry');
    }

    // Return minimal data; tracking number will be set by admin
    return {
      trackingNumber: null, // Admin will provide
      labelUrl: null,
      providerShipmentId: null,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      payload: { manual: true },
    };
  }

  async getLabel(shipmentId) {
    // Local couriers typically don't provide digital labels
    // Return placeholder
    return {
      labelUrl: null,
      format: 'none',
      note: 'Contact courier for physical label',
    };
  }

  /**
   * Track via webhook updates only
   * Shipment.events array contains all updates
   */
  async trackShipment(trackingNumber) {
    // In real implementation, query Shipment.events by trackingNumber
    // For now, return placeholder - webhook events drive status
    return {
      status: 'in_transit',
      events: [],
      lastUpdate: new Date(),
      note: 'Status updated via webhook',
    };
  }

  async cancelShipment(shipmentId) {
    return { success: true, refundAmount: 0 };
  }

  /**
   * Get rates - local couriers often have flat rates
   * Or can call a simple rate calculation endpoint
   */
  async getRates(cart, shippingAddress) {
    // Option 1: Fixed rate from carrier config
    const fixedRate = this.carrierProvider?.metadata?.fixedRate;
    if (fixedRate) {
      return {
        cost: fixedRate,
        estimatedDays: this.carrierProvider?.metadata?.estimatedDays || 1,
      };
    }

    // Option 2: Call carrier rate API if configured
    const rateUrl = this.carrierProvider?.endpoint; // e.g., https://courier.local/api/rates
    if (rateUrl) {
      try {
        const response = await axios.post(`${rateUrl}`, {
          origin: this.storeCarrier?.metadata?.originCity,
          destination: shippingAddress?.city,
          weight: cart.items?.reduce((s, i) => s + ((i.weight || 0) * (i.quantity || 1)), 0) || 0.5,
          items: cart.items?.length || 0,
        }, {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.data?.cost) {
          return {
            cost: response.data.cost,
            estimatedDays: response.data.estimatedDays || 2,
          };
        }
      } catch (err) {
        // Fallback on API failure
      }
    }

    // Default fallback rate
    return {
      cost: 30,
      estimatedDays: 2,
    };
  }

  /**
   * Verify webhook signature
   * Supports: HMAC-SHA256 signature in header
   */
  verifyWebhook(payload, signature, secret) {
    if (!secret) return true; // No validation if no secret

    const expected = crypto.createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }

  /**
   * Normalize webhook event
   * Handles various payload formats from different local couriers
   *
   * Expected webhook payload format:
   * {
   *   "trackingNumber": "12345",
   *   "status": "in_transit" | "delivered" | ...,
   *   "timestamp": "2026-08-30T11:00:00Z",
   *   "location": "City, Country",
   *   "notes": "Optional update message"
   * }
   */
  normalizeWebhook(event) {
    // Flexible field mapping to handle various courier formats
    const trackingNumber = event.trackingNumber || event.tracking_number || event.shipment_id || null;
    const status = event.status || event.delivery_status || event.state || 'unknown';
    const timestamp = event.timestamp || event.updated_at || new Date();

    return {
      eventType: 'shipment_status_update',
      eventId: trackingNumber,
      status: this._normalizeStatus(status),
      data: {
        trackingNumber,
        status: this._normalizeStatus(status),
        timestamp: new Date(timestamp),
        location: event.location || event.current_location || null,
        notes: event.notes || event.message || event.description || null,
      },
    };
  }

  /**
   * Normalize various status strings to standard enum
   */
  _normalizeStatus(status) {
    const mapping = {
      // Common variations
      pending: 'pending',
      'label created': 'label_created',
      label_created: 'label_created',
      'picked up': 'picked_up',
      picked_up: 'picked_up',
      pickup: 'picked_up',
      in_transit: 'in_transit',
      'in transit': 'in_transit',
      transit: 'in_transit',
      on_way: 'in_transit',
      'out for delivery': 'out_for_delivery',
      out_for_delivery: 'out_for_delivery',
      out_delivery: 'out_for_delivery',
      delivered: 'delivered',
      delivery_success: 'delivered',
      failed: 'failed_delivery',
      'delivery failed': 'failed_delivery',
      failed_delivery: 'failed_delivery',
      returned: 'returned',
      return: 'returned',
      cancelled: 'cancelled',
      cancel: 'cancelled',
    };

    const normalized = String(status).toLowerCase().trim();
    return mapping[normalized] || normalized; // Return as-is if unknown
  }

  /**
   * Get webhook endpoint for this carrier
   * Used by Store Admin to configure courier webhook
   */
  getWebhookUrl(storeId) {
    return `/api/webhooks/shipping/${storeId}/localcourier`;
  }
}

module.exports = LocalCourierAdapter;
