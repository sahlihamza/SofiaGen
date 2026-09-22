const StripeAdapter = require('./adapters/StripeAdapter');
const FlouciAdapter = require('./adapters/FlouciAdapter');
const KonnectAdapter = require('./adapters/KonnectAdapter');
const PayPalAdapter = require('./adapters/PayPalAdapter');
const BankTransferAdapter = require('./adapters/BankTransferAdapter');
const CashOnDeliveryAdapter = require('./adapters/CashOnDeliveryAdapter');

class PaymentProviderFactory {
  constructor() {
    this.adapters = new Map();
    this.register('stripe', StripeAdapter);
    this.register('woopayments', StripeAdapter);
    this.register('flouci', FlouciAdapter);
    this.register('konnect', KonnectAdapter);
    this.register('paypal', PayPalAdapter);
    this.register('bank_transfer', BankTransferAdapter);
    this.register('cash_on_delivery', CashOnDeliveryAdapter);
    this.register('cod', CashOnDeliveryAdapter);
    this.register('cheque', BankTransferAdapter);
  }

  register(code, AdapterClass) {
    this.adapters.set(String(code).toLowerCase(), AdapterClass);
  }

  get(code, config = {}) {
    const AdapterClass = this.adapters.get(String(code).toLowerCase());
    if (!AdapterClass) {
      throw new Error(`Payment provider '${code}' is not supported`);
    }
    return new AdapterClass(config);
  }

  has(code) {
    return this.adapters.has(String(code).toLowerCase());
  }

  getAllCodes() {
    return Array.from(this.adapters.keys());
  }
}

const paymentProviderFactory = new PaymentProviderFactory();

module.exports = paymentProviderFactory;
