const couponConditionData = [
  {
    code: "minimum_order_amount",
    name: "Minimum Order Amount",
    description: "Apply coupon only if order total meets minimum amount",
    config: { minAmount: 50 },
  },
  {
    code: "maximum_uses",
    name: "Maximum Uses",
    description: "Limit the number of times a coupon can be used",
    config: { maxUses: 100 },
  },
  {
    code: "customer_group",
    name: "Customer Group",
    description: "Apply coupon only to specific customer groups",
    config: { groupIds: [] },
  },
  {
    code: "product_category",
    name: "Product Category",
    description: "Apply coupon only to products in specific categories",
    config: { categoryIds: [] },
  },
  {
    code: "first_order_only",
    name: "First Order Only",
    description: "Apply coupon only to first-time customers",
    config: { enabled: true },
  },
];

module.exports = couponConditionData;