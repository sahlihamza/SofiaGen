const test = require("node:test");
const assert = require("node:assert/strict");

const { initiatePayment } = require("./paymentGatewayService");
const {
  PAYMENT_METHOD_KEYS,
  OFFLINE_PAYMENT_METHOD_KEYS,
  isOfflinePaymentMethod,
} = require("../utils/paymentMethods");

const order = {
  _id: "652f1c9e1f0a4b0012ab34cd",
  orderNumber: "1042",
  total: 120.5,
  user_info: { name: "Amine", email: "amine@example.com", contact: "+21620000000" },
};

// The gateways read their credentials from the method's config and fall back to
// the process env, so a stray key in the shell would let a call through to the
// real API. They are cleared for the duration of a test instead.
const CREDENTIAL_ENV_KEYS = [
  "STRIPE_KEY",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_APP_SECRET",
  "KONNECT_API_KEY",
  "KONNECT_WALLET_ID",
  "FLOUCI_APP_TOKEN",
  "FLOUCI_APP_SECRET",
];

const withoutCredentials = async (run) => {
  const saved = {};
  CREDENTIAL_ENV_KEYS.forEach((key) => {
    saved[key] = process.env[key];
    delete process.env[key];
  });

  try {
    return await run();
  } finally {
    CREDENTIAL_ENV_KEYS.forEach((key) => {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    });
  }
};

test("an offline method settles outside the app and charges nothing", async () => {
  for (const key of OFFLINE_PAYMENT_METHOD_KEYS) {
    const payment = await initiatePayment(order, { key, config: {} });

    assert.equal(payment.provider, key);
    assert.equal(payment.paymentStatus, "pending");
    assert.equal(payment.requiresAction, false);
  }
});

test("an offline method shows the store's own instructions when it has some", async () => {
  const payment = await initiatePayment(order, {
    key: "cod",
    config: { instructions: "Préparez l'appoint." },
  });

  assert.equal(payment.instructions, "Préparez l'appoint.");
});

// The regression this guards: the gateways were implemented but missing from
// the registry, so PaymentSettings rejected them and no store could ever turn
// them on. A key the app can start must be a key the store can enable.
test("every enabled-able online method reaches its gateway", async () => {
  const onlineKeys = PAYMENT_METHOD_KEYS.filter((key) => !isOfflinePaymentMethod(key));

  assert.deepEqual(onlineKeys, ["woopayments", "stripe", "paypal", "konnect", "flouci"]);

  await withoutCredentials(async () => {
    for (const key of onlineKeys) {
      const err = await initiatePayment(order, { key, config: {} }).then(
        () => null,
        (error) => error
      );

      assert.ok(err, `${key} should not settle without credentials`);
      // Refused for want of credentials, which only happens once the switch has
      // routed the key to a real gateway.
      assert.match(err.code, /_NOT_CONFIGURED$/, `${key} was not routed: ${err.code}`);
    }
  });
});

test("a method the app cannot start is refused rather than silently accepted", async () => {
  const err = await initiatePayment(order, { key: "bitcoin", config: {} }).then(
    () => null,
    (error) => error
  );

  assert.equal(err.code, "UNSUPPORTED_PAYMENT_METHOD");
  assert.equal(err.statusCode, 502);
});
