const PaymentAdapter = require('./PaymentAdapter');

class CashOnDeliveryAdapter extends PaymentAdapter {
  get providerCode() {
    return 'cash_on_delivery';
  }

  async createPayment(order, method) {
    const instructions = method?.config?.instructions || this.config.instructions || 'Vous réglerez votre commande en espéces à la livraison.';

    return {
      provider: 'cash_on_delivery',
      paymentStatus: 'pending',
      requiresAction: false,
      instructions,
      reference: `COD-${order.orderNumber}-${Date.now()}`,
      details: { method: 'cash_on_delivery' },
    };
  }

  async confirmPayment(reference) {
    return {
      status: 'pending',
      reference,
    };
  }

  async refundPayment(paymentId, amount, reason) {
    return {
      providerRefundId: `COD-REFUND-${paymentId}`,
      status: 'pending',
      amount: Number(amount),
    };
  }

  async getPaymentStatus(paymentId) {
    return { status: 'pending', reference: paymentId };
  }

  verifyWebhook(payload, signature, secret) {
    return true;
  }

  normalizeWebhook(event) {
    return {
      provider: 'cash_on_delivery',
      eventType: event.event || 'payment.updated',
      providerEventId: event.id || event.transactionId,
      data: event,
      raw: event,
    };
  }
}

module.exports = CashOnDeliveryAdapter;
