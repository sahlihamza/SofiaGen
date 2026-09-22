const crypto = require('crypto');
const ShippingWebhook = require('../models/shipping/ShippingWebhook');
const Shipment = require('../models/shipping/Shipment');
const CarrierProvider = require('../models/shipping/CarrierProvider');
const StoreCarrierProvider = require('../models/shipping/StoreCarrierProvider');
const ShipmentService = require('./ShipmentService');
const WebhookLogService = require('./WebhookLogService');
const logger = require('../config/logger');

/**
 * ShippingWebhookService - Process inbound carrier webhooks
 * Integrated with centralized WebhookLogService (WebhookLog)
 * Features:
 * - Idempotent processing (same eventId = one transition only)
 * - Unified retry mechanism via WebhookLogService
 * - Validates state transitions
 * - Logs ALL webhooks (success & failure) to central view
 */

class ShippingWebhookService {
  /**
   * Process incoming webhook from carrier
   * Idempotent: multiple identical calls produce same result
   * Logs to WebhookLog for centralized view
   */
  static async processWebhook(storeId, provider, payload, signature) {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    // Get carrier provider config
    const carrierProvider = await CarrierProvider.findOne({
      adapterKey: provider,
      isActive: true,
    });

    if (!carrierProvider) {
      throw new Error(`Unknown carrier provider: ${provider}`);
    }

    // Get adapter to normalize event
    const storeCarrier = await StoreCarrierProvider.findOne({
      storeId,
      carrierProviderId: carrierProvider._id,
      isActive: true,
    }).select('+credentials');

    if (!storeCarrier) {
      logger.warn(`Webhook from ${provider} for store ${storeId} but carrier not connected`);
      // Log rejection to central system
      WebhookLogService.record({
        provider,
        storeId,
        event: 'carrier_not_connected',
        status: 'failed',
        errorMessage: 'Carrier not connected to store',
        metadata: { payloadHash },
      }).catch(() => {});
      return { status: 'ignored', reason: 'carrier_not_connected' };
    }

    // Verify webhook signature
    const adapter = await ShipmentService.getAdapter(carrierProvider, storeCarrier);
    const isValid = adapter.verifyWebhook(payloadString, signature, carrierProvider.webhookSecret);

    if (!isValid) {
      logger.warn(`Invalid webhook signature from ${provider}`);
      // Log rejection to central system
      WebhookLogService.record({
        provider,
        storeId,
        event: 'signature_invalid',
        status: 'failed',
        errorMessage: 'Invalid webhook signature',
        metadata: { payloadHash },
      }).catch(() => {});
      return { status: 'rejected', reason: 'invalid_signature' };
    }

    // Normalize event to standard format
    const normalizedEvent = adapter.normalizeWebhook(payload);

    // Check for idempotence: same eventId = already processed
    const existingWebhook = await ShippingWebhook.findOne({
      provider,
      providerEventId: normalizedEvent.eventId,
    });

    if (existingWebhook && existingWebhook.status === 'processed') {
      logger.info(`Webhook ${provider}:${normalizedEvent.eventId} already processed - idempotent return`);
      return { status: 'idempotent', webhookId: existingWebhook._id };
    }

    // Create or update webhook record (domain-specific)
    let webhook = existingWebhook || new ShippingWebhook({
      storeId,
      provider,
      providerEventId: normalizedEvent.eventId,
      eventType: normalizedEvent.eventType,
      payloadHash,
      payload,
      normalizedData: normalizedEvent.data,
    });

    let processResult = { status: 'error' };

    try {
      // Find affected shipment by tracking number
      const shipment = await Shipment.findOne({
        trackingNumber: normalizedEvent.eventId,
        storeId,
      });

      if (shipment) {
        webhook.shipmentId = shipment._id;

        // Update shipment status via ShipmentService (validates transitions)
        await ShipmentService.updateShipmentFromWebhook(
          shipment._id,
          webhook._id.toString(),
          normalizedEvent
        );
      }

      // Mark webhook as processed
      webhook.status = 'processed';
      webhook.processedAt = new Date();
      webhook.attemptCount = (webhook.attemptCount || 0) + 1;
      await webhook.save();

      processResult = { status: 'processed', webhookId: webhook._id, shipmentId: webhook.shipmentId };

      logger.info(`Webhook processed: ${provider}:${normalizedEvent.eventId}  ${normalizedEvent.status}`);

      // Log to central system (SUCCESS)
      WebhookLogService.record({
        provider,
        storeId,
        event: normalizedEvent.eventType,
        status: 'success',
        attempts: webhook.attemptCount,
        sourceRef: webhook._id,
        sourceModel: 'ShippingWebhook',
        metadata: {
          shipmentId: webhook.shipmentId,
          trackingNumber: normalizedEvent.eventId,
          payloadHash,
        },
      }).catch(() => {});

      return processResult;
    } catch (err) {
      webhook.status = 'failed';
      webhook.error = err.message;
      webhook.attemptCount = (webhook.attemptCount || 0) + 1;
      await webhook.save();

      logger.error(`Webhook processing failed: ${err.message}`);

      // Log to central system (FAILURE)
      WebhookLogService.record({
        provider,
        storeId,
        event: normalizedEvent.eventType || 'shipment_status_update',
        status: 'failed',
        attempts: webhook.attemptCount,
        errorMessage: err.message,
        sourceRef: webhook._id,
        sourceModel: 'ShippingWebhook',
        metadata: {
          trackingNumber: normalizedEvent.eventId,
          payloadHash,
        },
      }).catch(() => {});

      throw err;
    }
  }

  /**
   * Get webhook status
   */
  static async getWebhook(webhookId) {
    return ShippingWebhook.findById(webhookId).populate('shipmentId');
  }

  /**
   * List webhooks for store
   */
  static async listWebhooks(storeId, { status, limit = 50, offset = 0 } = {}) {
    const query = { storeId };
    if (status) query.status = status;

    const total = await ShippingWebhook.countDocuments(query);
    const webhooks = await ShippingWebhook.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return { webhooks, total, offset, limit };
  }
}

// Register retry handler with centralized WebhookLogService
// This allows Super Admin to retry shipping webhooks from the unified view
WebhookLogService.registerRetryHandler('ShippingWebhook', async (webhookId) => {
  const webhook = await ShippingWebhook.findById(webhookId);
  if (!webhook) throw new Error('ShippingWebhook not found');

  if (webhook.shipmentId) {
    // Re-attempt shipment status update
    const shipment = await Shipment.findById(webhook.shipmentId);
    if (shipment) {
      await ShipmentService.updateShipmentFromWebhook(
        webhook.shipmentId,
        webhook._id.toString(),
        {
          status: webhook.normalizedData?.status,
          data: webhook.normalizedData,
        }
      );
    }
  }

  return { status: 'retried', webhookId };
});

module.exports = ShippingWebhookService;
