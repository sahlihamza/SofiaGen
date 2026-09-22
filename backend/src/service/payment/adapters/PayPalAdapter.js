const axios = require('axios');
const PaymentAdapter = require('./PaymentAdapter');

class PayPalAdapter extends PaymentAdapter {
  get providerCode() {
    return 'paypal';
  }

  async createPayment(order, method) {
    const clientId = method?.config?.clientId || this.config.clientId;
    const clientSecret = method?.config?.clientSecret || this.config.clientSecret;
    const base = method?.config?.apiBase || this.config.apiBase || 'https://api-m.sandbox.paypal.com';

    if (!clientId || !clientSecret) {
      const error = new Error('PayPal credentials not configured');
      error.code = 'PAYPAL_NOT_CONFIGURED';
      error.statusCode = 502;
      throw error;
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const { data: tokenData } = await axios.post(
      `${base}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const successUrl = `${this.config.storeUrl}/order/${order._id}?payment=success`;
    const cancelUrl = `${this.config.storeUrl}/checkout?payment=cancelled&order=${order._id}`;
    const currency = (method?.config?.currency || this.config.currency || 'USD').toUpperCase();

    const gatewayDecimals = (code) => {
      const map = { TND: 3, JOD: 3, KWD: 3 };
      return map[code] || 2;
    };

    const { data } = await axios.post(
      `${base}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: order.orderNumber,
            amount: {
              currency_code: currency,
              value: Number(order.total).toFixed(gatewayDecimals(currency)),
            },
          },
        ],
        application_context: {
          return_url: successUrl,
          cancel_url: cancelUrl,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const approveLink = (data.links || []).find((link) => link.rel === 'approve');

    return {
      provider: 'paypal',
      paymentStatus: 'pending',
      requiresAction: true,
      redirectUrl: approveLink?.href || null,
      reference: data.id,
      details: { paypalOrderId: data.id, currency },
    };
  }

  async confirmPayment(orderId) {
    const clientId = this.config.clientId;
    const clientSecret = this.config.clientSecret;
    const base = this.config.apiBase || 'https://api-m.sandbox.paypal.com';

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { data: tokenData } = await axios.post(
      `${base}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { data } = await axios.post(
      `${base}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    return {
      status: capture?.status === 'COMPLETED' ? 'paid' : 'pending',
      reference: data.id,
      providerRefundId: capture?.id,
    };
  }

  async refundPayment(captureId, amount, reason) {
    const clientId = this.config.clientId;
    const clientSecret = this.config.clientSecret;
    const base = this.config.apiBase || 'https://api-m.sandbox.paypal.com';

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { data: tokenData } = await axios.post(
      `${base}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const currency = (this.config.currency || 'USD').toUpperCase();
    const { data } = await axios.post(
      `${base}/v2/payments/captures/${captureId}/refund`,
      {
        amount: {
          value: Number(amount).toFixed(2),
          currency_code: currency,
        },
        note_to_payer: reason || 'Refund requested by customer',
      },
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      providerRefundId: data.id,
      status: data.status,
      amount: Number(data.amount?.value || amount),
    };
  }

  async getPaymentStatus(orderId) {
    const clientId = this.config.clientId;
    const clientSecret = this.config.clientSecret;
    const base = this.config.apiBase || 'https://api-m.sandbox.paypal.com';

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { data: tokenData } = await axios.post(
      `${base}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { data } = await axios.get(`${base}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    return {
      status: capture?.status === 'COMPLETED' ? 'paid' : 'pending',
      amount: capture?.amount?.value,
      currency: capture?.amount?.currency_code,
    };
  }

  verifyWebhook(payload, signature, secret) {
    return true;
  }

  normalizeWebhook(event) {
    return {
      provider: 'paypal',
      eventType: event.event_type || event.event || 'payment.updated',
      providerEventId: event.id || event.resource?.id,
      data: event.resource || event,
      raw: event,
    };
  }
}

module.exports = PayPalAdapter;
