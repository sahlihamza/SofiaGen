const axios = require('axios');
const PaymentAdapter = require('./PaymentAdapter');

class FlouciAdapter extends PaymentAdapter {
  get providerCode() {
    return 'flouci';
  }

  async createPayment(order, method) {
    const appToken = method?.config?.appToken || this.config.appToken;
    const appSecret = method?.config?.appSecret || this.config.appSecret;
    const base = method?.config?.apiBase || this.config.apiBase || 'https://developers.flouci.com/api';

    if (!appToken || !appSecret) {
      const error = new Error('Flouci credentials not configured');
      error.code = 'FLOUCI_NOT_CONFIGURED';
      error.statusCode = 502;
      throw error;
    }

    const successUrl = `${this.config.storeUrl}/order/${order._id}?payment=success`;
    const cancelUrl = `${this.config.storeUrl}/checkout?payment=cancelled&order=${order._id}`;

    const { data } = await axios.post(
      `${base}/generate_payment`,
      {
        app_token: appToken,
        app_secret: appSecret,
        amount: String(Math.round(Number(order.total) * 1000)),
        accept_card: 'true',
        session_timeout_secs: 1200,
        success_link: successUrl,
        fail_link: cancelUrl,
        developer_tracking_id: String(order._id),
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return {
      provider: 'flouci',
      paymentStatus: 'pending',
      requiresAction: true,
      redirectUrl: data?.result?.link || null,
      reference: data?.result?.payment_id || null,
      details: { paymentId: data?.result?.payment_id },
    };
  }

  async confirmPayment(paymentId) {
    return {
      status: 'paid',
      reference: paymentId,
    };
  }

  async refundPayment(paymentId, amount, reason) {
    const appToken = this.config.appToken;
    const appSecret = this.config.appSecret;
    const base = this.config.apiBase || 'https://developers.flouci.com/api';

    await axios.post(
      `${base}/refund`,
      {
        app_token: appToken,
        app_secret: appSecret,
        payment_id: paymentId,
        amount: Math.round(Number(amount) * 1000),
        reason: reason || 'requested_by_customer',
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return {
      providerRefundId: paymentId,
      status: 'processed',
      amount: Number(amount),
    };
  }

  async getPaymentStatus(paymentId) {
    const appToken = this.config.appToken;
    const appSecret = this.config.appSecret;
    const base = this.config.apiBase || 'https://developers.flouci.com/api';

    const { data } = await axios.get(`${base}/payment/${paymentId}`, {
      headers: { 'Content-Type': 'application/json' },
      params: { app_token: appToken, app_secret: appSecret },
    });

    const status = data?.status === 'PAID' ? 'paid' : data?.status === 'FAILED' ? 'failed' : 'pending';
    return { status, amount: data?.amount, currency: 'TND' };
  }

  verifyWebhook(payload, signature, secret) {
    return true;
  }

  normalizeWebhook(event) {
    return {
      provider: 'flouci',
      eventType: event.status || event.event || 'payment.updated',
      providerEventId: event.payment_id || event.id,
      data: event,
      raw: event,
    };
  }
}

module.exports = FlouciAdapter;
