const test = require("node:test");
const assert = require("node:assert/strict");

const { buildOrderItems, allocate } = require("./orderItemService");
const { calculateTax } = require("./checkoutTaxService");

const line = (overrides) => ({
  productId: "p1",
  variationId: null,
  name: "Produit",
  sku: "SKU-1",
  quantity: 1,
  unitPrice: 100,
  lineTotal: 100,
  taxable: true,
  ...overrides,
});

const sum = (items, key) =>
  Math.round(items.reduce((acc, item) => acc + item[key], 0) * 100) / 100;

test("a line with no discount and no tax is copied as is", () => {
  const [item] = buildOrderItems("order1", {
    lines: [line({ quantity: 2, unitPrice: 30, lineTotal: 60, sku: "" })],
  });

  assert.equal(item.orderId, "order1");
  assert.equal(item.productName, "Produit");
  assert.equal(item.sku, "");
  assert.equal(item.quantity, 2);
  assert.equal(item.unitPrice, 30);
  assert.equal(item.discount, 0);
  assert.equal(item.tax, 0);
  assert.equal(item.total, 60);
});

test("the cart discount is split in proportion to each line", () => {
  const items = buildOrderItems("order1", {
    lines: [line({ lineTotal: 100 }), line({ productId: "p2", lineTotal: 50 })],
    discount: 30,
  });

  assert.deepEqual(
    items.map((item) => item.discount),
    [20, 10]
  );
  assert.deepEqual(
    items.map((item) => item.total),
    [80, 40]
  );
});

test("the split adds up to the discount even when it doesn't divide evenly", () => {
  const items = buildOrderItems("order1", {
    lines: [line({ lineTotal: 10 }), line({ lineTotal: 10 }), line({ lineTotal: 10 })],
    discount: 10,
  });

  // 3.33 each leaves a cent, handed to the heaviest line.
  assert.equal(sum(items, "discount"), 10);
  assert.equal(sum(items, "total"), 20);
});

test("a discount can never make a line negative", () => {
  const items = buildOrderItems("order1", {
    lines: [line({ lineTotal: 40 }), line({ lineTotal: 60 })],
    // Larger than the cart: capped on the cart total before being split.
    discount: 500,
  });

  assert.deepEqual(
    items.map((item) => item.total),
    [0, 0]
  );
  assert.equal(sum(items, "discount"), 100);
});

test("only taxable lines carry VAT, and never the shipping's share of it", () => {
  const lines = [
    line({ lineTotal: 100, taxable: true }),
    line({ productId: "p2", lineTotal: 50, taxable: false }),
  ];
  const tax = calculateTax({
    lines,
    shippingCost: 10,
    shippingTaxable: true,
    discount: 30,
    settings: { enableTaxes: true, taxRate: 20 },
  });

  const items = buildOrderItems("order1", {
    lines,
    discount: 30,
    tax,
    shippingCost: 10,
    shippingTaxable: true,
  });

  // 18 of VAT in total, 2 of which is the VAT on the 10 of shipping.
  assert.equal(tax.amount, 18);
  assert.deepEqual(
    items.map((item) => item.tax),
    [16, 0]
  );

  // What the whole order charges must still add up.
  const orderTotal = sum(items, "total") + 10 + tax.amount;
  assert.equal(orderTotal, 148);
});

test("the VAT is split between two taxable lines on their discounted amount", () => {
  const lines = [line({ lineTotal: 100 }), line({ productId: "p2", lineTotal: 100 })];
  const tax = calculateTax({
    lines,
    shippingCost: 0,
    discount: 40,
    settings: { enableTaxes: true, taxRate: 20 },
  });

  const items = buildOrderItems("order1", { lines, discount: 40, tax });

  assert.equal(sum(items, "tax"), tax.amount);
  assert.deepEqual(
    items.map((item) => item.tax),
    [16, 16]
  );
});

test("a tax-inclusive store extracts the VAT instead of adding it", () => {
  const lines = [line({ lineTotal: 120 })];
  const tax = calculateTax({
    lines,
    settings: { enableTaxes: true, taxRate: 20, pricesIncludeTax: true },
  });

  const [item] = buildOrderItems("order1", { lines, tax });

  // The 20 of VAT is already inside the 120 charged, so `total` keeps it.
  assert.equal(item.tax, 20);
  assert.equal(item.total, 120);
});

test("the variation is kept, so two lines of the same product stay distinct", () => {
  const items = buildOrderItems("order1", {
    lines: [
      line({ variationId: "v1", sku: "TS-BLUE-L" }),
      line({ variationId: "v2", sku: "TS-BLUE-M" }),
    ],
  });

  assert.deepEqual(
    items.map((item) => item.variationId),
    ["v1", "v2"]
  );
});

test("an empty cart produces no line", () => {
  assert.deepEqual(buildOrderItems("order1", { lines: [] }), []);
});

test("allocate gives nothing away when there is nothing to give", () => {
  assert.deepEqual(allocate(0, [10, 20]), [0, 0]);
  assert.deepEqual(allocate(10, [0, 0]), [0, 0]);
  assert.deepEqual(allocate(10, []), []);
});
