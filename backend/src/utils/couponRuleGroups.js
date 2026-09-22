const couponRuleGroupData = [
  {
    name: "Welcome Discount",
    description: "10% off for new customers",
    rules: [
      { type: "minimum_order_amount", config: { minAmount: 30 } },
      { type: "first_order_only", config: { enabled: true } },
    ],
    action: { type: "percentage_discount", value: 10 },
  },
  {
    name: "Summer Sale",
    description: "15% off all orders",
    rules: [
      { type: "minimum_order_amount", config: { minAmount: 0 } },
    ],
    action: { type: "percentage_discount", value: 15 },
  },
  {
    name: "Free Shipping",
    description: "Free shipping on orders over $50",
    rules: [
      { type: "minimum_order_amount", config: { minAmount: 50 } },
    ],
    action: { type: "free_shipping", value: 0 },
  },
  {
    name: "Fixed Amount Discount",
    description: "$5 off all orders",
    rules: [],
    action: { type: "fixed_discount", value: 5 },
  },
];

module.exports = couponRuleGroupData;