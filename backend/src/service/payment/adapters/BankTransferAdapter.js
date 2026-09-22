const PaymentAdapter = require('./PaymentAdapter');

class BankTransferAdapter extends PaymentAdapter {
  get providerCode() {
    return 'bank_transfer';
  }

  async createPayment(order, method) {
    const instructions = method?.config?.instructions || this.config.instructions || 'Veuillez effectuer un virement bancaire avec le numéro de commande en référence.';

    return {
      provider: 'bank_transfer',
      paymentStatus: 'pending',
      requiresAction: false,
      instructions,
      reference: `BANK-${order.orderNumber}-${Date.now()}`,
      details: { method: 'bank_transfer' },
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
      providerRefundId: `BANK-REFUND-${paymentId}`,
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
      provider: 'bank_transfer',
      eventType: event.event || 'payment.updated',
      providerEventId: event.id || event.transactionId,
      data: event,
      raw: event,
    };
  }
}

module.exports = BankTransferAdapter;
