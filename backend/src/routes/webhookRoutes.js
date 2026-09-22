const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const PaymentProvider = require('../models/payment/PaymentProvider');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const PaymentWebhook = require('../models/payment/PaymentWebhook');
const PaymentLog = require('../models/payment/PaymentLog');
const paymentWebhookService = require('../service/payment/PaymentWebhookService');
const WebhookProcessingService = require('../service/payment/WebhookProcessingService');
const logger = require('../config/logger');
const { createRateLimiter } = require('../middleware/rateLimit');
const webhookLimiter = createRateLimiter({ max: 120, windowMinutes: 5, keyBy: "ip", message: "Too many webhook requests." });

const verifyWebhookSignature = async (providerCode, payload, signature, secret) => {
  if (!secret) return true;

  switch (providerCode) {
    case 'stripe': {
      const stripe = require('stripe')(secret);
      try {
        await stripe.webhooks.constructEvent(payload, signature, secret);
        return true;
      } catch (err) {
        logger.warn(`Stripe webhook signature verification failed: ${err.message}`);
        return false;
      }
    }
    case 'flouci':
    case 'konnect':
    case 'click_to_pay':
    case 'paypal':
    case 'razorpay':
    default: {
      if (!signature || !secret) return true;
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    }
  }
};

const normalizeWebhookEvent = (providerCode, event) => {
  const normalized = {
    provider: providerCode,
    eventType: event.type || event.event || 'unknown',
    providerEventId: event.id || event.eventId || event.transactionId || null,
    data: event.data || event,
    raw: event,
  };

  if (!normalized.providerEventId && event.data?.id) {
    normalized.providerEventId = event.data.id;
  }
  if (!normalized.providerEventId && event.data?.object?.id) {
    normalized.providerEventId = event.data.object.id;
  }

  return normalized;
};

const processPaymentEvent = async (webhook, normalized) => {
  const { providerEventId, eventType, data } = normalized;

  let payment = null;
  if (webhook.transactionId) {
    payment = await Payment.findById(webhook.transactionId).lean();
  }

  if (!payment && providerEventId) {
    payment = await Payment.findOne({ transactionId: providerEventId }).lean();
  }

  if (!payment && data?.orderId) {
    const order = await Order.findOne({ orderNumber: data.orderId }).lean();
    if (order?.paymentId) {
      payment = await Payment.findById(order.paymentId).lean();
    }
  }

  if (!payment && data?.metadata?.orderId) {
    payment = await Payment.findById(data.metadata.orderId).lean();
  }

  let newStatus = null;
  let paidAt = null;

  const lowerEvent = String(eventType || '').toLowerCase();
  if (lowerEvent.includes('succeeded') || lowerEvent.includes('completed') || lowerEvent === 'capture') {
    newStatus = 'paid';
    paidAt = new Date();
  } else if (lowerEvent.includes('failed') || lowerEvent.includes('declined') || lowerEvent.includes('canceled')) {
    newStatus = 'failed';
  } else if (lowerEvent.includes('refunded')) {
    newStatus = 'refunded';
  } else if (lowerEvent.includes('pending') || lowerEvent.includes('processing')) {
    newStatus = 'pending';
  }

  if (newStatus && payment) {
    await Payment.findByIdAndUpdate(payment._id, {
      status: newStatus,
      paidAt: paidAt || payment.paidAt,
    });

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId, {
        paymentStatus: newStatus,
        ...(newStatus === 'paid' ? { status: 'Payment-Accepted' } : {}),
        ...(newStatus === 'failed' ? { status: 'Cancel' } : {}),
      });
    }
  }

  return { status: 'processed', paymentId: payment?._id, newStatus };
};

const handlePaymentWebhook = async (req, res) => {
  const providerCode = String(req.params.provider || '').trim().toLowerCase();
  const rawBody = JSON.stringify(req.body) || '';
  const signature = String(req.headers['x-signature'] || req.headers['x-flouci-signature'] || req.headers['stripe-signature'] || '');

  const provider = await PaymentProvider.findOne({ code: providerCode, enabled: true, status: 'active' }).lean();
  if (!provider) {
    logger.warn(`Webhook received for disabled/unknown provider: ${providerCode}`);
    return res.status(404).json({ received: false, message: 'Provider not found or disabled' });
  }

  const webhookSecret = provider.getWebhookSecret?.() || provider.webhookSecret;
  const isValid = await verifyWebhookSignature(providerCode, rawBody, signature, webhookSecret);
  if (!isValid) {
    logger.warn(`Invalid webhook signature for provider: ${providerCode}`);
    return res.status(401).json({ received: false, message: 'Invalid signature' });
  }

  const normalized = normalizeWebhookEvent(providerCode, req.body);

  const outcome = await WebhookProcessingService.processWebhook(providerCode, req.body, {
    eventType: normalized.eventType,
    handler: async () => {
      const webhook = await paymentWebhookService.create({
        providerId: provider._id,
        event: normalized.eventType,
        payload: normalized.raw,
        headers: {
          signature,
          'user-agent': req.headers['user-agent'],
          'x-request-id': req.headers['x-request-id'],
        },
        signature,
        ipAddress: req.ip || req.connection?.remoteAddress,
      });

      const result = await processPaymentEvent(webhook, normalized);

      await paymentWebhookService.markProcessed(webhook._id, {
        paymentId: result.paymentId,
        newStatus: result.newStatus,
      });

      return { webhookId: webhook._id, ...result };
    },
  });

  if (outcome.status === 'ignored') {
    return res.status(200).json({ received: true, status: 'ignored', reason: outcome.reason });
  }

  if (outcome.status === 'failed') {
    logger.error(`Webhook processing failed for ${providerCode}: ${outcome.error}`);

    await PaymentLog.log({
      module: 'webhooks',
      action: 'processing_failed',
      message: `Webhook processing failed: ${providerCode} - ${normalized.eventType}`,
      details: { providerId: provider._id, eventId: outcome.eventId, error: outcome.error },
      providerId: provider._id,
      level: 'error',
    }).catch(() => {});

    return res.status(200).json({ received: true, status: 'failed', error: outcome.error });
  }

  const result = outcome.result || {};

  await PaymentLog.log({
    module: 'webhooks',
    action: 'received',
    message: `Webhook processed: ${providerCode} - ${normalized.eventType}`,
    details: {
      webhookId: result.webhookId,
      providerId: provider._id,
      providerCode: provider.code,
      eventType: normalized.eventType,
      providerEventId: normalized.providerEventId,
      eventId: outcome.eventId,
      paymentId: result.paymentId,
      newStatus: result.newStatus,
    },
    providerId: provider._id,
    transactionId: result.paymentId || null,
  }).catch(() => {});

  return res.status(200).json({ received: true, status: 'processed' });
};

router.post('/:provider', webhookLimiter, handlePaymentWebhook);

module.exports = router;
