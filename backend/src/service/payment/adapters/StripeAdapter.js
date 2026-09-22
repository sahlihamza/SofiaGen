const axios = require('axios');
const PaymentAdapter = require('./PaymentAdapter');

class StripeAdapter extends PaymentAdapter {
  get providerCode() {
    return 'stripe';
  }

  async createPayment(order, method) {
    const secretKey = method?.config?.secretKey || this.config.secretKey;
    if (!secretKey) {
      const error = new Error('Stripe secret key not configured');
      error.code = 'STRIPE_NOT_CONFIGURED';
      error.statusCode = 502;
      throw error;
    }

    const currency = (method?.config?.currency || this.config.currency || 'usd').toLowerCase();
    const stripe = require('stripe')(secretKey);

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(order.total) * 100),
      currency,
      description: `Order ${order.orderNumber}`,
      metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
      automatic_payment_methods: { enabled: true },
    });

    return {
      provider: 'stripe',
      paymentStatus: 'pending',
      requiresAction: true,
      clientSecret: intent.client_secret,
      reference: intent.id,
      details: { intentId: intent.id, currency },
    };
  }

  async confirmPayment(clientSecret) {
    const secretKey = this.config.secretKey;
    const stripe = require('stripe')(secretKey);

    const intent = await stripe.paymentIntents.retrieve(clientSecret.split('_secret_')[0]);
    if (!intent) {
      throw new Error('Payment intent not found');
    }

    return {
      status: intent.status === 'succeeded' ? 'paid' : 'pending',
      reference: intent.id,
    };
  }

  async refundPayment(paymentId, amount, reason) {
    const secretKey = this.config.secretKey;
    const stripe = require('stripe')(secretKey);

    const refund = await stripe.refunds.create({
      payment_intent: paymentId,
      amount: Math.round(Number(amount) * 100),
      reason: reason || 'requested_by_customer',
    });

    return {
      providerRefundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
    };
  }

  async getPaymentStatus(paymentId) {
    const secretKey = this.config.secretKey;
    const stripe = require('stripe')(secretKey);

    const intent = await stripe.paymentIntents.retrieve(paymentId);
    return {
      status: intent.status,
      amount: intent.amount / 100,
      currency: intent.currency,
    };
  }

  verifyWebhook(payload, signature, secret) {
    try {
      const stripe = require('stripe')(secret || this.config.webhookSecret);
      stripe.webhooks.constructEvent(payload, signature, secret || this.config.webhookSecret);
      return true;
    } catch (err) {
      return false;
    }
  }

  normalizeWebhook(event) {
    return {
      provider: 'stripe',
      eventType: event.type,
      providerEventId: event.id || event.data?.object?.id,
      data: event.data?.object || event.data,
      raw: event,
    };
  }
}

module.exports = StripeAdapter;
