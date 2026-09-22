const axios = require('axios');
const PaymentAdapter = require('./PaymentAdapter');

class KonnectAdapter extends PaymentAdapter {
  get providerCode() {
    return 'konnect';
  }

  async createPayment(order, method) {
    const apiKey = method?.config?.apiKey || this.config.apiKey;
    const walletId = method?.config?.walletId || this.config.walletId;
    const base = method?.config?.apiBase || this.config.apiBase || 'https://api.sandbox.konnect.network/api/v2';

    if (!apiKey || !walletId) {
      const error = new Error('Konnect credentials not configured');
      error.code = 'KONNECT_NOT_CONFIGURED';
      error.statusCode = 502;
      throw error;
    }

    const successUrl = `${this.config.storeUrl}/order/${order._id}?payment=success`;
    const failUrl = `${this.config.storeUrl}/checkout?payment=cancelled&order=${order._id}`;

    const currency = (method?.config?.currency || this.config.currency || 'TND').toUpperCase();
    const amount = Math.round(Number(order.total) * (currency === 'TND' ? 1000 : 100));

    const { data } = await axios.post(
      `${base}/payments/init-payment`,
      {
        receiverWalletId: walletId,
        token: currency,
        amount,
        type: 'immediate',
        description: `Order ${order.orderNumber}`,
        acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
        firstName: order.user_info?.name || '',
        email: order.user_info?.email || '',
        phoneNumber: order.user_info?.contact || '',
        orderId: order.orderNumber,
        successUrl,
        failUrl,
        theme: 'light',
      },
      { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } }
    );

    return {
      provider: 'konnect',
      paymentStatus: 'pending',
      requiresAction: true,
      redirectUrl: data.payUrl || null,
      reference: data.paymentRef || null,
      details: { paymentRef: data.paymentRef, currency },
    };
  }

  async confirmPayment(paymentRef) {
    return {
      status: 'paid',
      reference: paymentRef,
    };
  }

  async refundPayment(paymentRef, amount, reason) {
    const apiKey = this.config.apiKey;
    const base = this.config.apiBase || 'https://api.sandbox.konnect.network/api/v2';

    await axios.post(
      `${base}/payments/refund`,
      {
        paymentRef,
        amount: Math.round(Number(amount) * 1000),
        reason: reason || 'requested_by_customer',
      },
      { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } }
    );

    return {
      providerRefundId: paymentRef,
      status: 'processed',
      amount: Number(amount),
    };
  }

  async getPaymentStatus(paymentRef) {
    const apiKey = this.config.apiKey;
    const base = this.config.apiBase || 'https://api.sandbox.konnect.network/api/v2';

    const { data } = await axios.get(`${base}/payments/${paymentRef}`, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    });

    const status = data?.status === 'PAID' ? 'paid' : data?.status === 'FAILED' ? 'failed' : 'pending';
    return { status, amount: data?.amount, currency: data?.currency || 'TND' };
  }

  verifyWebhook(payload, signature, secret) {
    return true;
  }

  normalizeWebhook(event) {
    return {
      provider: 'konnect',
      eventType: event.status || event.event || 'payment.updated',
      providerEventId: event.paymentRef || event.id,
      data: event,
      raw: event,
    };
  }
}

module.exports = KonnectAdapter;
