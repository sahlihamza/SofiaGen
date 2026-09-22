const test = require("node:test");
const assert = require("node:assert/strict");

const { resolvePaidAt } = require("./paymentService");
const {
  isOfflinePaymentMethod,
  publicPaymentConfig,
} = require("../utils/paymentMethods");

test("a payment that isn't paid has no paidAt", () => {
  assert.equal(resolvePaidAt("pending"), null);
  assert.equal(resolvePaidAt("failed"), null);
  assert.equal(resolvePaidAt("cancelled"), null);
});

test("a refund clears the moment the money had landed", () => {
  const paidOn = new Date("2026-08-01T10:00:00Z");

  assert.equal(resolvePaidAt("refunded", { current: paidOn }), null);
});

test("reaching paid stamps the moment, and keeps it on the next save", () => {
  const before = Date.now();
  const stamped = resolvePaidAt("paid");

  assert.ok(stamped instanceof Date);
  assert.ok(stamped.getTime() >= before);

  // A payment already paid keeps its original date, it is not re-stamped.
  const paidOn = new Date("2026-08-01T10:00:00Z");
  assert.equal(resolvePaidAt("paid", { current: paidOn }).toISOString(), paidOn.toISOString());
});

test("a back-dated payment keeps the date it was actually received", () => {
  const received = "2026-07-15T08:30:00Z";

  assert.equal(
    resolvePaidAt("paid", { paidAt: received }).toISOString(),
    new Date(received).toISOString()
  );
});

test("offline methods are the ones that settle outside the app", () => {
  assert.equal(isOfflinePaymentMethod("cod"), true);
  assert.equal(isOfflinePaymentMethod("bank_transfer"), true);
  assert.equal(isOfflinePaymentMethod("cheque"), true);
  assert.equal(isOfflinePaymentMethod("COD"), true);

  assert.equal(isOfflinePaymentMethod("stripe"), false);
  assert.equal(isOfflinePaymentMethod("paypal"), false);
  assert.equal(isOfflinePaymentMethod(undefined), false);
});

test("the storefront never receives a gateway credential", () => {
  const config = publicPaymentConfig({
    publishableKey: "pk_live_123",
    secretKey: "sk_live_do_not_leak",
    clientId: "paypal-client",
    clientSecret: "shhh",
    webhookSecret: "whsec_123",
    apiKey: "leak",
    api_key: "leak",
    privateToken: "leak",
    instructions: "Payez à la livraison",
    currency: "TND",
  });

  assert.deepEqual(config, {
    publishableKey: "pk_live_123",
    clientId: "paypal-client",
    instructions: "Payez à la livraison",
    currency: "TND",
  });
});

test("an empty or missing config is an empty object, never a crash", () => {
  assert.deepEqual(publicPaymentConfig(null), {});
  assert.deepEqual(publicPaymentConfig(undefined), {});
  assert.deepEqual(publicPaymentConfig("nope"), {});
});
