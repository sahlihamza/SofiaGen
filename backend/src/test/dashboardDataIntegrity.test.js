const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const Store = require("../models/Store");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const StockReservation = require("../models/StockReservation");
const Payment = require("../models/Payment");
const ProductReview = require("../models/ProductReview");
const cache = require("../lib/cache");
const StoreOwnerDashboardServiceV2 = require("../service/StoreOwnerDashboardServiceV2");

// STORE-DASHBOARD-01  regression coverage for the bugs this hardening pass
// actually found and fixed (not hypothetical ones): the Order.status ->
// dashboard-bucket mapping silently dropping "Delivered"/"Cancel", three
// aggregate $match stages matching a raw string storeId against an ObjectId
// field (always zero rows), a Payment "successful" status literal
// ("succeeded") the schema's real enum can never contain, and the
// analytics-range cache key collision. Same real-database convention as
// storeIsolation.test.js  this class of bug is invisible to pure-logic
// tests.

let storeA;
let storeB;
let productA1;
let productA2;
let customerA;
let orderDelivered;
let orderCancel;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  storeA = await Store.create({ name: "__dash_test__ Store A" });
  storeB = await Store.create({ name: "__dash_test__ Store B" });

  productA1 = await Product.create({ productName: "__dash_test__ Widget", storeId: storeA._id, price: 10, regularPrice: 50, stockQuantity: 20, manageStock: true, sku: `dash-a1-${Date.now()}` });
  productA2 = await Product.create({ productName: "__dash_test__ Gadget", storeId: storeA._id, price: 10, regularPrice: 30, stockQuantity: 5, manageStock: true, sku: `dash-a2-${Date.now()}` });

  customerA = await Customer.create({ firstName: "DashA", lastName: "Test", email: `dash-a-${Date.now()}@example.com`, storeId: storeA._id });

  orderDelivered = await Order.create({ storeId: storeA._id, user: customerA._id, subTotal: 100, total: 100, status: "Delivered", paymentStatus: "paid", paymentMethod: "Cash" });
  await OrderItem.create({ orderId: orderDelivered._id, productId: productA1._id, productName: productA1.productName, sku: productA1.sku, quantity: 3, unitPrice: 20, discount: 0, tax: 0, total: 60 });
  await OrderItem.create({ orderId: orderDelivered._id, productId: productA2._id, productName: productA2.productName, sku: productA2.sku, quantity: 2, unitPrice: 20, discount: 0, tax: 0, total: 40 });

  orderCancel = await Order.create({ storeId: storeA._id, user: customerA._id, subTotal: 50, total: 50, status: "Cancel", paymentStatus: "pending", paymentMethod: "Cash" });
  await StockReservation.create({ orderId: orderCancel._id, productId: productA1._id, quantity: 4, status: "reserved" });
});

test.after(async () => {
  const orderIds = [orderDelivered?._id, orderCancel?._id].filter(Boolean);
  const productIds = [productA1?._id, productA2?._id].filter(Boolean);
  await Promise.all([
    OrderItem.deleteMany({ orderId: { $in: orderIds } }),
    StockReservation.deleteMany({ productId: { $in: productIds } }),
    Payment.deleteMany({ storeId: { $in: [storeA?._id, storeB?._id] } }),
    ProductReview.deleteMany({ storeId: { $in: [storeA?._id, storeB?._id] } }),
    Order.deleteMany({ storeId: storeA?._id, _id: { $in: orderIds } }),
    Customer.deleteMany({ storeId: { $in: [storeA?._id, storeB?._id] } }),
    Product.deleteMany({ storeId: storeA?._id, _id: { $in: productIds } }),
  ]);
  await Store.deleteMany({ _id: { $in: [storeA?._id, storeB?._id] } });
  // The in-memory cache backend schedules a real setTimeout per entry (up to
  // CACHE_TTL=45s) to expire it  those timers are unref'd nowhere, so they
  // keep the process (and `node --test`) alive well past the last assertion
  // unless explicitly cleared here.
  await cache.flush();
  await mongoose.disconnect();
});

test("Orders widget: Delivered maps to completed, Cancel maps to cancelled (not dropped by a lowercase-identity mismatch)", async () => {
  const orders = await StoreOwnerDashboardServiceV2.buildOrdersPayload(String(storeA._id));
  assert.equal(orders.counts.completed, 1);
  assert.equal(orders.counts.cancelled, 1);
});

test("KPI: monthly revenue counts every real order for the store, growth is a real number not Math.random()", async () => {
  const kpis = await StoreOwnerDashboardServiceV2.buildKpiCardsPayload(String(storeA._id));
  assert.equal(kpis.kpis.thisMonth, 150);
  assert.ok(typeof kpis.kpis.growth === "object" && kpis.kpis.growth !== null);
  assert.equal(typeof kpis.kpis.growth.sales, "number");
});

test("Inventory: reservedStock is the real StockReservation sum, inventoryValue is honestly unavailable (no costPrice field exists)", async () => {
  const inventory = await StoreOwnerDashboardServiceV2.buildInventoryPayload(String(storeA._id));
  assert.equal(inventory.reservedStock, 4);
  assert.equal(inventory.inventoryValue, null);
  assert.equal(inventory.inventoryValueAvailable, false);
  assert.ok(inventory.topStock.length > 0);

  const inventoryB = await StoreOwnerDashboardServiceV2.buildInventoryPayload(String(storeB._id));
  assert.equal(inventoryB.reservedStock, 0, "store B must not see store A's stock reservation");
});

test("Top products: sales/revenue come from real OrderItem lines, not rating.count or $rand growth", async () => {
  const topProducts = await StoreOwnerDashboardServiceV2.buildTopProductsPayload(String(storeA._id));
  const widget = topProducts.find((p) => p.productName === "__dash_test__ Widget");
  assert.ok(widget);
  assert.equal(widget.sales, 3);
  assert.equal(widget.revenue, 60);
  assert.equal(widget.growth, null);
});

test("Best customers: totalSpent/orders/lastOrderAt come from real Order aggregation, not Customer.createdAt (regression: aggregate $match needs a cast ObjectId)", async () => {
  const bestCustomers = await StoreOwnerDashboardServiceV2.buildBestCustomersPayload(String(storeA._id));
  const dashA = bestCustomers.find((c) => c.name.includes("DashA"));
  assert.ok(dashA, "an aggregate $match against a raw string storeId silently matches nothing  this must never regress");
  assert.equal(dashA.orders, 2);
  assert.equal(dashA.totalSpent, 150);
  assert.ok(dashA.lastOrderAt);
});

test("Payments: revenue/breakdown match real 'paid' payments (regression: the schema enum has no 'succeeded' status, and aggregate $match needs a cast ObjectId)", async () => {
  const payment = await Payment.create({ storeId: storeA._id, orderId: orderDelivered._id, method: "card", gateway: "stripe", amount: 100, status: "paid" });
  try {
    const payments = await StoreOwnerDashboardServiceV2.buildPaymentsPayload(String(storeA._id));
    assert.equal(payments.revenue, 100);
    assert.equal(payments.successful, 1);
    assert.ok(payments.breakdown.some((b) => b.provider === "stripe" && b.amount === 100));

    const paymentsB = await StoreOwnerDashboardServiceV2.buildPaymentsPayload(String(storeB._id));
    assert.equal(paymentsB.revenue, 0, "store B must not see store A's payment");
  } finally {
    await Payment.deleteOne({ _id: payment._id });
  }
});

test("Financial: never fabricates expenses/profit from a revenue percentage", async () => {
  const financial = await StoreOwnerDashboardServiceV2.buildFinancialPayload(String(storeA._id));
  assert.equal(financial.revenue, 150);
  assert.equal(financial.expenses, null);
  assert.equal(financial.profit, null);
});

test("Reviews: averageRating reflects real approved reviews (regression: aggregate $match needs a cast ObjectId)", async () => {
  const review = await ProductReview.create({ storeId: storeA._id, productId: productA1._id, customerId: null, rating: 4, comment: "test", status: "approved", reviewerName: "Tester", reviewerEmail: "tester@example.com" });
  try {
    const reviews = await StoreOwnerDashboardServiceV2.buildReviewsPayload(String(storeA._id));
    assert.equal(reviews.averageRating, 4);
  } finally {
    await ProductReview.deleteOne({ _id: review._id });
  }
});

test("Cache: analytics range is part of the cache key  7-day and 90-day payloads never collide", async () => {
  const storeId = String(storeA._id);
  await StoreOwnerDashboardServiceV2.invalidateCache(storeId);
  await StoreOwnerDashboardServiceV2.getCached(storeId, "analytics:7days", () => StoreOwnerDashboardServiceV2.buildSalesAnalyticsPayload(storeId, "7days"));
  await StoreOwnerDashboardServiceV2.getCached(storeId, "analytics:90days", () => StoreOwnerDashboardServiceV2.buildSalesAnalyticsPayload(storeId, "90days"));
  const cached7 = await cache.get(`dashboard:v2:owner:${storeId}:analytics:7days`);
  const cached90 = await cache.get(`dashboard:v2:owner:${storeId}:analytics:90days`);
  assert.ok(cached7 && cached90);
  assert.equal(cached7.range, "7days");
  assert.equal(cached90.range, "90days");
});

test("Cache: refresh invalidates only the calling store's keys, never another store's", async () => {
  const idA = String(storeA._id);
  const idB = String(storeB._id);
  await StoreOwnerDashboardServiceV2.getCached(idA, "kpi", () => StoreOwnerDashboardServiceV2.buildKpiCardsPayload(idA));
  await StoreOwnerDashboardServiceV2.getCached(idB, "kpi", () => StoreOwnerDashboardServiceV2.buildKpiCardsPayload(idB));

  await StoreOwnerDashboardServiceV2.invalidateCache(idA);

  assert.equal(await cache.get(`dashboard:v2:owner:${idA}:kpi`), null, "store A's cache must be gone after its own refresh");
  assert.ok(await cache.get(`dashboard:v2:owner:${idB}:kpi`), "store B's cache must survive store A's refresh");
});

test("Quick Actions: filtered by the caller's real RBAC permissions, never a bare role check (pure logic, no DB fixtures needed)", () => {
  const all = StoreOwnerDashboardServiceV2.buildQuickActionsPayload(null);
  assert.equal(all.length, 7, "null (superadmin / no filter) must show every action");
  assert.ok(!("requires" in all[0]), "the internal 'requires' field must never reach the API response");

  const readOnlyCatalogue = StoreOwnerDashboardServiceV2.buildQuickActionsPayload(new Set(["products.view"]));
  assert.deepEqual(readOnlyCatalogue.map((a) => a.id), ["export-products"], "products.view alone must unlock only export, never create-product or any other module's action");

  const noPermissions = StoreOwnerDashboardServiceV2.buildQuickActionsPayload(new Set());
  assert.equal(noPermissions.length, 0, "a role with zero permissions must see zero quick actions");
});
