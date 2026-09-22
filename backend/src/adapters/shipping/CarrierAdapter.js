/**
 * CarrierAdapter - Abstract base class for shipping carrier integrations
 * Defines interface that all carrier adapters must implement
 *
 * Extends this class and implement all async methods for new carriers
 */

class CarrierAdapter {
  constructor(carrierProvider, storeCarrier) {
    this.carrierProvider = carrierProvider; // Platform config
    this.storeCarrier = storeCarrier; // Store-specific connection
  }

  /**
   * Create shipment label and get tracking number
   * Must return REAL values from provider, never generate locally
   *
   * @param {Object} order - Order document
   * @param {Object} shippingAddress - Customer shipping address
   * @returns {Promise<{trackingNumber, labelUrl, providerShipmentId, estimatedDelivery?}>}
   */
  async createShipment(order, shippingAddress) {
    throw new Error('createShipment must be implemented');
  }

  /**
   * Get shipping label (in case of regeneration)
   *
   * @param {string} shipmentId - Provider shipment ID
   * @returns {Promise<{labelUrl, format}>}
   */
  async getLabel(shipmentId) {
    throw new Error('getLabel must be implemented');
  }

  /**
   * Track shipment status
   *
   * @param {string} trackingNumber - Tracking number from provider
   * @returns {Promise<{status, events, lastUpdate}>}
   */
  async trackShipment(trackingNumber) {
    throw new Error('trackShipment must be implemented');
  }

  /**
   * Cancel/refund shipment
   *
   * @param {string} shipmentId - Provider shipment ID
   * @returns {Promise<{success, refundAmount?}>}
   */
  async cancelShipment(shipmentId) {
    throw new Error('cancelShipment must be implemented');
  }

  /**
   * Get shipping rates for checkout
   *
   * @param {Object} cart - Cart with items and weights
   * @param {Object} shippingAddress - Destination address
   * @returns {Promise<{cost, estimatedDays}>}
   */
  async getRates(cart, shippingAddress) {
    throw new Error('getRates must be implemented');
  }

  /**
   * Verify webhook signature from provider
   * Return true if valid, false if invalid
   *
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Signature from header
   * @param {string} secret - Provider secret
   * @returns {boolean}
   */
  verifyWebhook(payload, signature, secret) {
    throw new Error('verifyWebhook must be implemented');
  }

  /**
   * Normalize webhook event to standard format
   *
   * @param {Object} event - Raw webhook event
   * @returns {{eventType, eventId, status, data}}
   */
  normalizeWebhook(event) {
    throw new Error('normalizeWebhook must be implemented');
  }

  /**
   * Get provider identifier code
   * Must be unique per adapter (e.g. 'aramex', 'dhl', 'localcourier')
   */
  get providerCode() {
    throw new Error('providerCode must be implemented');
  }
}

module.exports = CarrierAdapter;
