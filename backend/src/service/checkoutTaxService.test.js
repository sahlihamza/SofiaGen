const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateTax } = require("./checkoutTaxService");

const lines = [
  { lineTotal: 100, taxable: true },
  { lineTotal: 50, taxable: false },
];

test("no tax when the store has taxes disabled", () => {
  const result = calculateTax({
    lines,
    shippingCost: 10,
    settings: { enableTaxes: false, taxRate: 20 },
  });

  assert.equal(result.enabled, false);
  assert.equal(result.amount, 0);
});

test("no tax when the rate is zero, even with taxes enabled", () => {
  const result = calculateTax({
    lines,
    settings: { enableTaxes: true, taxRate: 0 },
  });

  assert.equal(result.enabled, false);
  assert.equal(result.amount, 0);
});

test("only taxable lines and taxable shipping feed the base", () => {
  const result = calculateTax({
    lines,
    shippingCost: 10,
    shippingTaxable: true,
    settings: { enableTaxes: true, taxRate: 20 },
  });

  // 100 taxable items + 10 shipping, the 50 non-taxable line is left out.
  assert.equal(result.taxableBase, 110);
  assert.equal(result.amount, 22);
});

test("shipping flagged non-taxable stays out of the base", () => {
  const result = calculateTax({
    lines,
    shippingCost: 10,
    shippingTaxable: false,
    settings: { enableTaxes: true, taxRate: 20 },
  });

  assert.equal(result.taxableBase, 100);
  assert.equal(result.amount, 20);
});

test("a cart discount is split across lines in proportion to the taxable share", () => {
  const result = calculateTax({
    lines,
    shippingCost: 0,
    discount: 30,
    settings: { enableTaxes: true, taxRate: 10 },
  });

  // Taxable items are 100 of a 150 cart, so 2/3 of the 30 discount (=20)
  // reduces the taxable base: 100 - 20 = 80.
  assert.equal(result.taxableBase, 80);
  assert.equal(result.amount, 8);
});

test("tax-inclusive prices extract the VAT instead of adding it", () => {
  const result = calculateTax({
    lines: [{ lineTotal: 120, taxable: true }],
    shippingCost: 0,
    settings: { enableTaxes: true, taxRate: 20, pricesIncludeTax: true },
  });

  assert.equal(result.pricesIncludeTax, true);
  assert.equal(result.taxableBase, 120);
  assert.equal(result.amount, 20);
});
