const express = require('express');
const router = express.Router();
const ShippingWebhookService = require('../service/ShippingWebhookService');
const logger = require('../config/logger');

/**
 * Inbound webhook routes for shipping carriers
 * Webhook URLs: POST /api/webhooks/shipping/:storeId/:provider
 *
 * Example: POST /api/webhooks/shipping/store-123/aramex
 *          POST /api/webhooks/shipping/store-123/localcourier
 *
 * No authentication required (carrier POSTs directly)
 * Signature verification via adapter.verifyWebhook()
 */

/**
 * POST /api/webhooks/shipping/:storeId/:provider
 * Receive webhook from carrier
 */
router.post('/:storeId/:provider', async (req, res) => {
  const { storeId, provider } = req.params;
  const payload = req.body;
  const signature = req.headers['x-signature'] || req.headers['x-webhook-signature'] || '';

  try {
    const result = await ShippingWebhookService.processWebhook(
      storeId,
      provider,
      payload,
      signature
    );

    // Always return 200 to carrier (even on idempotent/ignored)
    // This prevents carrier from retrying
    res.status(200).json(result);

    logger.info(`Webhook processed for ${provider}: ${result.status}`);
  } catch (err) {
    logger.error(`Webhook processing error: ${err.message}`);

    // Return 400 to signal carrier to retry
    // (carrier typically retries on 4xx/5xx)
    res.status(400).json({
      status: 'error',
      message: err.message,
    });
  }
});

/**
 * GET /api/webhooks/shipping/:storeId
 * Get webhook history for store
 * Requires auth
 */
router.get('/:storeId', async (req, res) => {
  try {
    const { status, limit, offset } = req.query;

    // In production: verify req.user.storeId === storeId
    // For now: assume auth middleware handles this

    const result = await ShippingWebhookService.listWebhooks(
      req.params.storeId,
      { status, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/webhooks/shipping/retry
 * Retry failed webhooks (admin only)
 */
router.post('/retry/all', async (req, res) => {
  try {
    const results = await ShippingWebhookService.retryFailedWebhooks();
    res.json({
      status: 'retry_started',
      results,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
