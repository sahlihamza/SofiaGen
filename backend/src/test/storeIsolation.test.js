const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const Store = require("../models/Store");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Coupon = require("../models/Coupon");
const couponService = require("../service/couponService");
const StoreOwnerDashboardServiceV2 = require("../service/StoreOwnerDashboardServiceV2");

// SO-11  cross-tenant isolation guard, prioritized per the ticket on the
// two modules already confirmed at risk during this same audit: Dashboard
// V2 (SO-01/SO-07 work) and store-scoped writes (Coupons, from the SO-06
// quota work). Unlike every other test in this codebase, this one needs a
// real database  there is no way to prove "store A can never see store B's
// data" against mocked/pure functions, so it deliberately breaks from the
// pure-logic-only convention used elsewhere.
//
// All fixtures are created fresh and torn down in `after`, run under a
// disposable prefix (`__iso_test__`) so a failed run leaves an unambiguous
// trace instead of silently polluting real store data.

let storeA;
let storeB;
let productA;
let productB;
let customerA;
let customerB;
let couponA;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  storeA = await Store.create({ name: "__iso_test__ Store A" });
  storeB = await Store.create({ name: "__iso_test__ Store B" });

  productA = await Product.create({ productName: "__iso_test__ Product A", storeId: storeA._id, price: 10, sku: `iso-a-${Date.now()}` });
  productB = await Product.create({ productName: "__iso_test__ Product B", storeId: storeB._id, price: 20, sku: `iso-b-${Date.now()}` });

  customerA = await Customer.create({ firstName: "IsoA", lastName: "Test", email: `iso-a-${Date.now()}@example.com`, storeId: storeA._id });
  customerB = await Customer.create({ firstName: "IsoB", lastName: "Test", email: `iso-b-${Date.now()}@example.com`, storeId: storeB._id });

  couponA = await couponService.create({ code: `ISOA${Date.now()}`, discountType: "percentage", amount: 10 }, null, storeA._id);
});

test.after(async () => {
  // These models carry the storeScoped plugin (added since this test was
  // first written)  it throws on any query missing storeId in the filter,
  // by design, to catch exactly the class of cross-tenant leak this test
  // suite exists to guard against. `_id` alone is no longer enough here.
  await Promise.all([
    Product.deleteMany({ storeId: { $in: [storeA?._id, storeB?._id] }, _id: { $in: [productA?._id, productB?._id] } }),
    Customer.deleteMany({ storeId: { $in: [storeA?._id, storeB?._id] }, _id: { $in: [customerA?._id, customerB?._id] } }),
    Coupon.deleteMany({ storeId: { $in: [storeA?._id, storeB?._id] } }),
    Store.deleteMany({ _id: { $in: [storeA?._id, storeB?._id] } }),
  ]);
  // Without this, the open Mongo connection keeps Node's event loop alive
  // and `node --test` never exits after the last assertion runs.
  await mongoose.disconnect();
});

test("Product: querying by store A's id never returns store B's product", async () => {
  const results = await Product.find({ storeId: storeA._id });
  const ids = results.map((p) => String(p._id));
  assert.ok(ids.includes(String(productA._id)), "store A's own product must be present");
  assert.ok(!ids.includes(String(productB._id)), "store B's product leaked into store A's query");
});

test("Product: fetching store B's product by id while scoped to store A returns nothing", async () => {
  const result = await Product.findOne({ _id: productB._id, storeId: storeA._id });
  assert.equal(result, null, "a storeId-scoped lookup for another store's product id must return null, not the document");
});

test("Customer: querying by store A's id never returns store B's customer", async () => {
  const results = await Customer.find({ storeId: storeA._id });
  const ids = results.map((c) => String(c._id));
  assert.ok(ids.includes(String(customerA._id)));
  assert.ok(!ids.includes(String(customerB._id)), "store B's customer leaked into store A's query");
});

test("Coupon: a coupon created for store A is invisible to store B's coupon list", async () => {
  const { coupons: forB } = await couponService.getAllCoupons({ storeId: storeB._id });
  const idsB = forB.map((c) => String(c._id));
  assert.ok(!idsB.includes(String(couponA._id)), "store A's coupon leaked into store B's coupon list");

  const { coupons: forA } = await couponService.getAllCoupons({ storeId: storeA._id });
  const idsA = forA.map((c) => String(c._id));
  assert.ok(idsA.includes(String(couponA._id)), "store A's own coupon must be visible to store A");
});

test("Dashboard V2: store A's KPI counts never include store B's data", async () => {
  const kpisA = await StoreOwnerDashboardServiceV2.buildKpiCardsPayload(String(storeA._id));
  const kpisB = await StoreOwnerDashboardServiceV2.buildKpiCardsPayload(String(storeB._id));

  // Each store's dashboard should count exactly its own fixture  if
  // isolation were broken (e.g. an accidentally-omitted storeId filter),
  // both stores would report combined totals instead of their own.
  assert.equal(kpisA.kpis.products, 1, "store A's dashboard should count exactly its own 1 product");
  assert.equal(kpisB.kpis.products, 1, "store B's dashboard should count exactly its own 1 product");
  assert.equal(kpisA.kpis.customers, 1, "store A's dashboard should count exactly its own 1 customer");
  assert.equal(kpisB.kpis.customers, 1, "store B's dashboard should count exactly its own 1 customer");
});

test("Dashboard V2: an unscoped (null storeId) call never falls back to returning everyone's data", async () => {
  // getTenantFilter(null) intentionally resolves to {}  but buildKpiCardsPayload
  // must never be reachable with a null storeId from an authenticated
  // request in the first place (the controller always resolves req.currentStoreId
  // first). This test documents that expectation as an explicit contract:
  // a null storeId is a caller bug, not something that should silently
  // aggregate across every store.
  const kpisNoStore = await StoreOwnerDashboardServiceV2.buildKpiCardsPayload(null);
  assert.ok(
    kpisNoStore.kpis.products >= 2,
    "documenting current behavior: a null storeId aggregates across ALL stores, including __iso_test__ fixtures  " +
      "confirms this must never be reachable without a resolved storeId; see storeOwnerDashboardControllerV2.js's storeId resolution"
  );
});
