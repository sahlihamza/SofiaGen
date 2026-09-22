const paymentSettingsData = [
  {
    key: "bank_transfer",
    title: "Direct bank transfer",
    description: "Accept payments in person via BACS.",
    enabled: true,
    order: 0,
  },
  {
    key: "cheque",
    title: "Check payments",
    description: "Accept payments in person via checks.",
    enabled: false,
    order: 1,
  },
  {
    key: "cod",
    title: "Cash on delivery",
    description: "Have customers pay with cash upon delivery.",
    enabled: true,
    order: 2,
  },
  {
    key: "woopayments",
    title: "WooPayments - Credit/debit card",
    description: "Accept credit cards, debit cards, and Apple Pay.",
    enabled: true,
    order: 3,
  },
];

module.exports = paymentSettingsData;