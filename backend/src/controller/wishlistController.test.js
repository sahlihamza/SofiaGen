const test = require("node:test");
const assert = require("node:assert/strict");

// SO-09 regression coverage (same fix as cartController.test.js): a logged-in
// customer's storeId must always come from their own account, never from the
// request body or query string.

const mockModule = (modulePath, mockExports) => {
  const resolved = require.resolve(modulePath);
  const original = require.cache[resolved]?.exports;
  require.cache[resolved] = { ...require.cache[resolved], exports: mockExports };
  return original;
};

const restoreModule = (modulePath, original) => {
  const resolved = require.resolve(modulePath);
  if (original === undefined) {
    delete require.cache[resolved];
  } else {
    require.cache[resolved].exports = original;
  }
};

const freshRequire = (modulePath) => {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(modulePath);
};

const fakeRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

test("wishlist: a logged-in customer's own storeId is used, ignoring a spoofed query.storeId", async () => {
  let capturedOwnerArgs = null;
  class WishlistError extends Error {}
  const origService = mockModule("../service/wishlistService", {
    WishlistError,
    resolveOwner: (args) => {
      capturedOwnerArgs = args;
      return { storeId: args.storeId, customerId: args.customer?._id || null, sessionId: null, customer: args.customer };
    },
    getCurrentWishlist: async () => ({ items: [] }),
  });

  const wishlistController = freshRequire("./wishlistController");

  const req = {
    method: "GET",
    query: { storeId: "STORE_B_SPOOFED" },
    customer: { _id: "cust1", storeId: "STORE_A_REAL" },
  };
  const res = fakeRes();

  await wishlistController.getCurrentWishlist(req, res);

  assert.equal(capturedOwnerArgs.storeId, "STORE_A_REAL");
  assert.notEqual(capturedOwnerArgs.storeId, "STORE_B_SPOOFED");

  restoreModule("../service/wishlistService", origService);
});

test("wishlist: mergeWishlist also ignores a spoofed body.storeId for a logged-in customer", async () => {
  let capturedArgs = null;
  class WishlistError extends Error {}
  const origService = mockModule("../service/wishlistService", {
    WishlistError,
    mergeWishlists: async (args) => {
      capturedArgs = args;
      return { items: [] };
    },
  });

  const wishlistController = freshRequire("./wishlistController");

  const req = {
    method: "POST",
    body: { storeId: "STORE_B_SPOOFED", sessionId: "guest-session-1" },
    customer: { _id: "cust1", storeId: "STORE_A_REAL" },
  };
  const res = fakeRes();

  await wishlistController.mergeWishlist(req, res);

  assert.equal(capturedArgs.storeId, "STORE_A_REAL");

  restoreModule("../service/wishlistService", origService);
});
