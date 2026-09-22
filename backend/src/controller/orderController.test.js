const test = require("node:test");
const assert = require("node:assert/strict");

// SO-08 regression coverage: the orders back-office list/dashboard endpoints
// used to trust req.query.storeId directly (ahead of the authenticated
// context), letting any logged-in user read another store's orders by
// passing ?storeId=<other store>. storeId must now come only from
// authContext/currentStoreId, and no storeId at all must never mean "every
// store's orders".

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
  res.send = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

// A chainable find() result matching how getAllOrders uses it:
// .select().sort().skip().limit() then awaited.
const chainable = (result) => {
  const chain = {
    select: () => chain,
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    then: (resolve) => resolve(result),
  };
  return chain;
};

const mockOrderModel = (capture) => ({
  schema: { path: () => ({ enumValues: ["Pending", "Processing", "Delivered", "Cancel"] }) },
  countDocuments: async (query) => {
    capture.query = query;
    return 0;
  },
  find: (query) => {
    capture.query = query;
    return chainable([]);
  },
});

test("getAllOrders: req.query.storeId is ignored  authContext.storeId is the only source", async () => {
  const capture = {};
  const origOrder = mockModule("../models/Order", mockOrderModel(capture));
  const origCart = mockModule("../models/Cart", {});
  const origAudit = mockModule("../service/AuditService", {});

  const orderController = freshRequire("./orderController");

  const req = {
    query: { storeId: "STORE_B_SPOOFED", page: "1", limit: "10" },
    authContext: { storeId: "STORE_A_REAL" },
    currentStoreId: null,
  };
  const res = fakeRes();

  await orderController.getAllOrders(req, res);

  assert.equal(capture.query.storeId, "STORE_A_REAL");
  assert.notEqual(capture.query.storeId, "STORE_B_SPOOFED");

  restoreModule("../models/Order", origOrder);
  restoreModule("../models/Cart", origCart);
  restoreModule("../service/AuditService", origAudit);
});

test("getAllOrders: no resolvable storeId returns an empty result, never an unscoped query", async () => {
  const capture = { called: false };
  const origOrder = mockModule("../models/Order", {
    schema: { path: () => ({ enumValues: ["Pending"] }) },
    countDocuments: async () => {
      capture.called = true;
      return 0;
    },
    find: () => {
      capture.called = true;
      return chainable([]);
    },
  });
  const origCart = mockModule("../models/Cart", {});
  const origAudit = mockModule("../service/AuditService", {});

  const orderController = freshRequire("./orderController");

  const req = {
    query: { page: "1", limit: "10" },
    authContext: {},
    currentStoreId: null,
  };
  const res = fakeRes();

  await orderController.getAllOrders(req, res);

  assert.equal(capture.called, false);
  assert.equal(res.body.orders.length, 0);
  assert.equal(res.body.totalDoc, 0);

  restoreModule("../models/Order", origOrder);
  restoreModule("../models/Cart", origCart);
  restoreModule("../service/AuditService", origAudit);
});
