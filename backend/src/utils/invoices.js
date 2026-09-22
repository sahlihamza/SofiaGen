const invoiceData = [
  {
    invoiceNumber: "INV-2026-001",
    storeName: "Seed Store Alpha",
    planName: "Seed Starter",
    items: [
      { description: "Seed Starter Plan - Monthly", quantity: 1, unitPrice: 0, total: 0 },
    ],
    subtotal: 0,
    tax: 0,
    total: 0,
    currency: "USD",
    status: "paid",
    paidAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    invoiceNumber: "INV-2026-002",
    storeName: "Seed Store Beta",
    planName: "Seed Growth",
    items: [
      { description: "Seed Growth Plan - Yearly", quantity: 1, unitPrice: 290, total: 290 },
    ],
    subtotal: 290,
    tax: 0,
    total: 290,
    currency: "USD",
    status: "paid",
    paidAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    issuedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    invoiceNumber: "INV-2026-003",
    storeName: "Seed Store Gamma",
    planName: "Seed Growth",
    items: [
      { description: "Seed Growth Plan - Monthly", quantity: 1, unitPrice: 29, total: 29 },
    ],
    subtotal: 29,
    tax: 0,
    total: 29,
    currency: "USD",
    status: "overdue",
    paidAt: null,
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    issuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

module.exports = invoiceData;