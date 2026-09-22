class PaymentAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  async createPayment(order, method) {
    throw new Error('createPayment must be implemented');
  }

  async confirmPayment(paymentIntentId, method) {
    throw new Error('confirmPayment must be implemented');
  }

  async refundPayment(paymentId, amount, reason) {
    throw new Error('refundPayment must be implemented');
  }

  async getPaymentStatus(paymentId) {
    throw new Error('getPaymentStatus must be implemented');
  }

  verifyWebhook(payload, signature, secret) {
    throw new Error('verifyWebhook must be implemented');
  }

  normalizeWebhook(event) {
    throw new Error('normalizeWebhook must be implemented');
  }

  get providerCode() {
    throw new Error('providerCode must be implemented');
  }
}

module.exports = PaymentAdapter;
