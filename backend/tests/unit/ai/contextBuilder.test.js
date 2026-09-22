const test = require("node:test");
const assert = require("node:assert/strict");

const aiContextBuilder = require("../../../src/service/ai/aiContextBuilder");

function reqWith({ storeId, userId, pageContext }) {
  return {
    authContext: { storeId, userId },
    user: { _id: userId, currentStoreId: storeId },
  };
}

test("aiContextBuilder — drops sensitive keys (password, token, key)", () => {
  const safe = aiContextBuilder.pickSafe({
    name: "Alice",
    password: "secret",
    apiKey: "sk-1234",
    refresh_token: "rt-1234",
    token: "t-1234",
    orderCount: 12,
  });
  assert.equal(safe.name, "Alice");
  assert.equal(safe.orderCount, 12);
  assert.equal(safe.password, undefined);
  assert.equal(safe.apiKey, undefined);
  assert.equal(safe.refresh_token, undefined);
  assert.equal(safe.token, undefined);
});

test("aiContextBuilder — truncates long strings", () => {
  const safe = aiContextBuilder.pickSafe({ note: "x".repeat(2000) });
  assert.ok(safe.note.length <= 600);
  assert.match(safe.note, /…/);
});

test("aiContextBuilder — storeId comes from auth context, NEVER the body", async () => {
  const out = await aiContextBuilder.build({
    req: reqWith({ storeId: "STORE-A", userId: "USER-1" }),
    pageContext: { module: "dashboard", storeId: "STORE-B-INJECTED" },
  });
  assert.equal(out.storeId, "STORE-A");
  // The body-supplied storeId must NOT have leaked into the snapshot key.
  assert.notEqual(out.storeId, "STORE-B-INJECTED");
});

test("aiContextBuilder — returns minimal context without a store", async () => {
  const out = await aiContextBuilder.build({
    req: { authContext: {}, user: null },
    pageContext: { module: "dashboard" },
  });
  assert.equal(out.storeId, null);
  assert.equal(out.module, "dashboard");
});