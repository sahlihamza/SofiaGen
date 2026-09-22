const test = require("node:test");
const assert = require("node:assert/strict");

const { holdsStock } = require("./stockReservationService");

test("a product with stock management holds units", () => {
  assert.equal(holdsStock({ productId: "p1", manageStock: true, quantity: 2 }), true);
});

test("a variation always holds units  it has its own counter", () => {
  assert.equal(
    holdsStock({ productId: "p1", variationId: "v1", manageStock: false, quantity: 1 }),
    true
  );
});

test("an untracked product holds nothing, so it gets no reservation row", () => {
  // Always sellable: no counter moved, nothing to give back, nothing to audit.
  assert.equal(holdsStock({ productId: "p1", manageStock: false, quantity: 3 }), false);
  assert.equal(holdsStock({ productId: "p1" }), false);
});
