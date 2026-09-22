export const DEFAULT_PAYMENT_METHOD_TEXT = {
  bank_transfer: {
    title: "Direct bank transfer",
    description:
      "Accept payments in person via BACS. Also known as direct bank/wire transfer.",
  },
  cheque: {
    title: "Check payments",
    description:
      "Accept payments in person via checks. This offline gateway can also be useful to test purchases.",
  },
  cod: {
    title: "Cash on delivery",
    description: "Have your customers pay with cash (or another method) upon delivery.",
  },
  woopayments: {
    title: "WooPayments  Credit/debit card",
    description:
      "With WooPayments, your store has the flexibility to accept credit cards, debit cards, and payments via Apple Pay.",
  },
  stripe: {
    title: "Stripe  Credit/debit card",
    description:
      "Accept credit and debit cards directly on the checkout page. The card is entered without ever leaving the store.",
  },
  paypal: {
    title: "PayPal",
    description:
      "Send your customers to PayPal to approve the payment, then bring them back to the order confirmation.",
  },
  konnect: {
    title: "Konnect",
    description:
      "Tunisian payment gateway: wallet, bank card and e-DINAR. The customer pays on the Konnect page.",
  },
  flouci: {
    title: "Flouci",
    description:
      "Tunisian payment gateway: pay by card or from the Flouci app, on the Flouci page.",
  },
};

// The credentials each gateway needs, mirroring what
// backend/src/service/paymentGatewayService.js reads out of `method.config`.
// `secret` only drives the input type  what the storefront is allowed to see
// is decided server-side by publicPaymentConfig, never here.
// A method absent from this map settles outside the app and has nothing to
// configure beyond its instructions.
const STRIPE_CONFIG_FIELDS = [
  { name: "publishableKey", secret: false, envKey: "STRIPE_PUBLISHABLE_KEY" },
  { name: "secretKey", secret: true, envKey: "STRIPE_KEY" },
  { name: "currency", secret: false, envKey: "CURRENCY" },
];

export const PAYMENT_METHOD_CONFIG_FIELDS = {
  stripe: STRIPE_CONFIG_FIELDS,
  // WooPayments is Stripe behind a different name, and is started by the same
  // code path, so it takes the same keys.
  woopayments: STRIPE_CONFIG_FIELDS,
  paypal: [
    { name: "clientId", secret: false, envKey: "PAYPAL_CLIENT_ID" },
    { name: "clientSecret", secret: true, envKey: "PAYPAL_APP_SECRET" },
    { name: "apiBase", secret: false, envKey: "PAYPAL_API_BASE" },
    { name: "currency", secret: false, envKey: "CURRENCY" },
  ],
  konnect: [
    { name: "apiKey", secret: true, envKey: "KONNECT_API_KEY" },
    { name: "walletId", secret: false, envKey: "KONNECT_WALLET_ID" },
    { name: "apiBase", secret: false, envKey: "KONNECT_API_BASE" },
    { name: "currency", secret: false, envKey: "CURRENCY" },
  ],
  flouci: [
    { name: "appToken", secret: true, envKey: "FLOUCI_APP_TOKEN" },
    { name: "appSecret", secret: true, envKey: "FLOUCI_APP_SECRET" },
    { name: "apiBase", secret: false, envKey: "FLOUCI_API_BASE" },
  ],
};

export const getPaymentMethodConfigFields = (key) =>
  PAYMENT_METHOD_CONFIG_FIELDS[key] || [];


const LEGACY_PAYMENT_METHOD_TEXT = {
  bank_transfer: {
    title: "Virement bancaire",
    description:
      "Acceptez les paiements en personne avec BACS. Aussi connu sous le nom de virement/bancaire.",
  },
  cheque: {
    title: "Paiements par chéque",
    description:
      "Accepter les paiements par chéque en personne. Cette passerelle hors-ligne peut être utile pour tester les achats.",
  },
  cod: {
    title: "Paiement à la livraison",
    description:
      "Demandez  vos clients de payer en espéces (ou par tout autre moyen) à la livraison.",
  },
  woopayments: {
    title: "WooPayments  Carte de crédit/carte de débit",
    description:
      "Avec WooPayments, votre boutique a la flexibilité nécessaire pour accepter les cartes de crédit, les cartes de débit et les paiements via Apple Pay.",
  },
};

const isUntouchedDefault = (value, key, field) =>
  value === DEFAULT_PAYMENT_METHOD_TEXT[key]?.[field] ||
  value === LEGACY_PAYMENT_METHOD_TEXT[key]?.[field];

export const getPaymentMethodDisplayText = (method, t) => {
  const title = isUntouchedDefault(method.title, method.key, "title")
    ? t(`PaymentMethodTitle_${method.key}`)
    : method.title;

  const description = isUntouchedDefault(method.description, method.key, "description")
    ? t(`PaymentMethodDesc_${method.key}`)
    : method.description;

  return { title, description };
};
