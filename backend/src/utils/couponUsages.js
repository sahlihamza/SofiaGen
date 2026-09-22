const couponUsageData = [
  {
    couponCode: "WELCOME10",
    storeName: "Seed Store Alpha",
    customerName: "John Doe",
    usedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    discountApplied: 10,
  },
  {
    couponCode: "SUMMER15",
    storeName: "Seed Store Beta",
    customerName: "Jane Smith",
    usedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    discountApplied: 15,
  },
  {
    couponCode: "FREESHIP",
    storeName: "Seed Store Gamma",
    customerName: "Bob Wilson",
    usedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    discountApplied: 0,
  },
  {
    couponCode: "WELCOME10",
    storeName: "Seed Store Alpha",
    customerName: "Alice Brown",
    usedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    discountApplied: 10,
  },
];

module.exports = couponUsageData;