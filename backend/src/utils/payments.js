const paymentData = [
  {
    storeName: "Seed Store Alpha",
    amount: 0,
    currency: "USD",
    method: "bank_transfer",
    status: "succeeded",
    transactionId: "TXN-2026-001",
    paidAt: new Date().toISOString(),
  },
  {
    storeName: "Seed Store Beta",
    amount: 290,
    currency: "USD",
    method: "woopayments",
    status: "succeeded",
    transactionId: "TXN-2026-002",
    paidAt: new Date().toISOString(),
  },
  {
    storeName: "Seed Store Gamma",
    amount: 29,
    currency: "USD",
    method: "cod",
    status: "failed",
    transactionId: "TXN-2026-003",
    paidAt: null,
  },
];

module.exports = paymentData;