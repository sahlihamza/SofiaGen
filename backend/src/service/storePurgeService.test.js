const test = require("node:test");
const assert = require("node:assert/strict");

// SO-14 regression coverage: Orders must be anonymized, not deleted, when a
// store is purged  accounting/legal records can't be blindly wiped along
// with disposable catalog/settings data.

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

test("anonymizeStoreOrders strips PII but keeps amounts, and never deletes the order", async () => {
  const savedOrders = [];
  const fakeOrder = {
    storeId: "store1",
    anonymizedAt: null,
    user_info: { name: "Jane Doe", email: "jane@example.com", phone: "555", city: "Paris", country: "FR" },
    billing_info: { name: "Jane Doe", email: "jane@example.com", address: "1 rue X", city: "Paris" },
    total: 199.99,
    save: async function () {
      savedOrders.push(this);
    },
  };

  const origOrder = mockModule("../models/Order", {
    find: async (query) => {
      assert.equal(query.storeId, "store1");
      assert.equal(query.anonymizedAt, null);
      return [fakeOrder];
    },
  });

  // storePurgeService requires a long list of models at load time  stub
  // every one so freshRequire doesn't need a real DB connection.
  const modelStubs = [
    "../models/Store", "../models/User", "../models/UserStore", "../models/Role",
    "../models/StoreDomain", "../models/GeneralSettings", "../models/ProductSettings",
    "../models/ShippingZone", "../models/ShippingClass", "../models/ShippingSettings",
    "../models/PickupLocation", "../models/Product", "../models/Customer",
    "../models/ProductReview", "../models/Coupon", "../models/Subscription",
    "../models/Backup", "../models/Post", "../models/PostCategory", "../models/PostTag",
    "../models/PostComment", "../models/Gallery", "../models/ProductCategory",
    "../models/StockMovement", "../models/Brand", "../models/Attribute", "../models/Menu",
    "../models/FormSubmission", "../models/SavedBlock.model", "../models/StoreUsage",
    "../models/Theme", "../models/Page", "../models/GlobalComponent",
  ];
  const originals = modelStubs.map((p) => [p, mockModule(p, { deleteMany: async () => ({ deletedCount: 0 }), find: async () => [] })]);

  const storePurgeService = freshRequire("./storePurgeService");

  const count = await storePurgeService.anonymizeStoreOrders("store1");

  assert.equal(count, 1);
  assert.equal(savedOrders.length, 1);
  assert.equal(fakeOrder.user_info.name, "");
  assert.equal(fakeOrder.user_info.email, "");
  assert.equal(fakeOrder.user_info.phone, "");
  assert.equal(fakeOrder.user_info.city, "Paris"); // jurisdiction data kept
  assert.equal(fakeOrder.user_info.country, "FR");
  assert.equal(fakeOrder.billing_info.address, "");
  assert.equal(fakeOrder.total, 199.99); // accounting data untouched
  assert.ok(fakeOrder.anonymizedAt instanceof Date);

  restoreModule("../models/Order", origOrder);
  originals.forEach(([p, orig]) => restoreModule(p, orig));
});
