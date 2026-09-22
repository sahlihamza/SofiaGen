const test = require("node:test");
const assert = require("node:assert/strict");

const {
  matchesPostalCode,
  freeShippingAvailable,
  estimatedDelivery,
} = require("./shippingRateService");

test("a zone with no postcode restriction matches every address", () => {
  assert.equal(matchesPostalCode([], "1000"), true);
  assert.equal(matchesPostalCode(undefined, ""), true);
});

test("exact postcodes match case-insensitively", () => {
  assert.equal(matchesPostalCode(["1000", "2000"], "2000"), true);
  assert.equal(matchesPostalCode(["SW1A 1AA"], "sw1a 1aa"), true);
  assert.equal(matchesPostalCode(["1000"], "1001"), false);
});

test("wildcard postcodes match a prefix", () => {
  assert.equal(matchesPostalCode(["10*"], "1050"), true);
  assert.equal(matchesPostalCode(["10*"], "2050"), false);
});

test("numeric ranges match the bounds inclusively", () => {
  assert.equal(matchesPostalCode(["1000...2000"], "1500"), true);
  assert.equal(matchesPostalCode(["1000...2000"], "1000"), true);
  assert.equal(matchesPostalCode(["1000...2000"], "2001"), false);
});

test("a restricted zone never matches an address without a postcode", () => {
  assert.equal(matchesPostalCode(["1000"], ""), false);
});

test("free shipping with no requirement is always offered", () => {
  const method = { freeShippingRequirement: "no_requirement", minOrderAmount: null };
  assert.equal(freeShippingAvailable(method, { subtotal: 0, subtotalBeforeDiscount: 0 }), true);
});

test("free shipping on a minimum amount checks the discounted subtotal", () => {
  const method = { freeShippingRequirement: "min_amount", minOrderAmount: 100 };

  assert.equal(
    freeShippingAvailable(method, { subtotal: 90, subtotalBeforeDiscount: 120 }),
    false
  );
  assert.equal(
    freeShippingAvailable(method, { subtotal: 100, subtotalBeforeDiscount: 120 }),
    true
  );
});

test("applyMinBeforeCouponDiscount checks the subtotal before the coupon", () => {
  const method = {
    freeShippingRequirement: "min_amount",
    minOrderAmount: 100,
    applyMinBeforeCouponDiscount: true,
  };

  assert.equal(
    freeShippingAvailable(method, { subtotal: 90, subtotalBeforeDiscount: 120 }),
    true
  );
});

test("the coupon requirement needs a free-shipping coupon on the cart", () => {
  const method = { freeShippingRequirement: "coupon", minOrderAmount: null };

  assert.equal(
    freeShippingAvailable(method, { subtotal: 500, hasFreeShippingCoupon: false }),
    false
  );
  assert.equal(
    freeShippingAvailable(method, { subtotal: 0, hasFreeShippingCoupon: true }),
    true
  );
});

test("min_amount_and_coupon needs both, min_amount_or_coupon needs either", () => {
  const and = {
    freeShippingRequirement: "min_amount_and_coupon",
    minOrderAmount: 100,
  };
  const or = { freeShippingRequirement: "min_amount_or_coupon", minOrderAmount: 100 };

  assert.equal(freeShippingAvailable(and, { subtotal: 150, hasFreeShippingCoupon: false }), false);
  assert.equal(freeShippingAvailable(and, { subtotal: 150, hasFreeShippingCoupon: true }), true);
  assert.equal(freeShippingAvailable(or, { subtotal: 150, hasFreeShippingCoupon: false }), true);
  assert.equal(freeShippingAvailable(or, { subtotal: 10, hasFreeShippingCoupon: true }), true);
});

test("a method with no configured estimate has no delivery date", () => {
  assert.equal(
    estimatedDelivery({ estimatedDeliveryMinDays: null, estimatedDeliveryMaxDays: null }),
    null
  );
});

test("a single configured bound is used for both ends of the estimate", () => {
  const estimate = estimatedDelivery({
    estimatedDeliveryMinDays: null,
    estimatedDeliveryMaxDays: 3,
  });

  assert.equal(estimate.minDays, 3);
  assert.equal(estimate.maxDays, 3);
  assert.ok(estimate.minDate instanceof Date);
});
