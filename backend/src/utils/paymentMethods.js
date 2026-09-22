const DEFAULT_PAYMENT_METHODS = [
  {
    key: "bank_transfer",
    title: "Direct bank transfer",
    description:
      "Accept payments in person via BACS. Also known as direct bank/wire transfer.",
    enabled: false,
    order: 0,
  },
  {
    key: "cheque",
    title: "Check payments",
    description:
      "Accept payments in person via checks. This offline gateway can also be useful to test purchases.",
    enabled: false,
    order: 1,
  },
  {
    key: "cod",
    title: "Cash on delivery",
    description:
      "Have your customers pay with cash (or another method) upon delivery.",
    enabled: false,
    order: 2,
  },
  {
    key: "woopayments",
    title: "WooPayments  Credit/debit card",
    description:
      "With WooPayments, your store has the flexibility to accept credit cards, debit cards, and payments via Apple Pay.",
    enabled: false,
    order: 3,
  },
  {
    key: "stripe",
    title: "Stripe  Credit/debit card",
    description:
      "Accept credit and debit cards directly on the checkout page. The card is entered without ever leaving the store.",
    enabled: false,
    order: 4,
  },
  {
    key: "paypal",
    title: "PayPal",
    description:
      "Send your customers to PayPal to approve the payment, then bring them back to the order confirmation.",
    enabled: false,
    order: 5,
  },
  {
    key: "konnect",
    title: "Konnect",
    description:
      "Tunisian payment gateway: wallet, bank card and e-DINAR. The customer pays on the Konnect page.",
    enabled: false,
    order: 6,
  },
  {
    key: "flouci",
    title: "Flouci",
    description:
      "Tunisian payment gateway: pay by card or from the Flouci app, on the Flouci page.",
    enabled: false,
    order: 7,
  },
];

// Every key the store can enable. Kept in step with the gateways
// paymentGatewayService.initiatePayment knows how to start  a key missing here
// is rejected by the PaymentSettings enum and can never reach the checkout.
const PAYMENT_METHOD_KEYS = DEFAULT_PAYMENT_METHODS.map((method) => method.key);

// Methods that settle outside the app: nothing is charged online, the order is
// created and simply waits. checkoutService and paymentGatewayService both
// branch on this instead of listing the keys again.
const OFFLINE_PAYMENT_METHOD_KEYS = ["bank_transfer", "cheque", "cod"];

const isOfflinePaymentMethod = (key) =>
  OFFLINE_PAYMENT_METHOD_KEYS.includes(String(key || "").trim().toLowerCase());

// A method's `config` holds its gateway credentials. The storefront needs part
// of it (the publishable key, the client id, the offline instructions) and must
// never see the rest, so anything whose name smells of a credential is dropped
//  a deny list, so a key added later is hidden by default rather than leaked.
const SECRET_CONFIG_KEY = /secret|password|passphrase|private|token|webhook|api[_-]?key/i;

const publicPaymentConfig = (config) => {
  if (!config || typeof config !== "object") return {};

  return Object.entries(config).reduce((safe, [key, value]) => {
    if (!SECRET_CONFIG_KEY.test(key)) safe[key] = value;
    return safe;
  }, {});
};

module.exports = {
  DEFAULT_PAYMENT_METHODS,
  PAYMENT_METHOD_KEYS,
  OFFLINE_PAYMENT_METHOD_KEYS,
  isOfflinePaymentMethod,
  publicPaymentConfig,
};
