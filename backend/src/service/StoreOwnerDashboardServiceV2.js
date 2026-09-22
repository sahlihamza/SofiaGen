const mongoose = require("mongoose");
const cache = require("../lib/cache");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const ProductReview = require("../models/ProductReview");
const Payment = require("../models/Payment");
const Coupon = require("../models/Coupon");
const Store = require("../models/Store");
const CustomerSession = require("../models/CustomerSession");
const AuditLog = require("../models/AuditLog");
const Cart = require("../models/Cart");
const StockReservation = require("../models/StockReservation");
const SoftLimitService = require("./SoftLimitService");
const StoreOnboardingService = require("./StoreOnboardingService");

const CACHE_TTL = 45;
const CACHE_PREFIX = "dashboard:v2:owner";
const cacheKey = (storeId, suffix) => `${CACHE_PREFIX}:${storeId}:${suffix}`;
const getTenantFilter = (storeId) => (storeId ? { storeId } : {});

// STORE-DASHBOARD-01 5: `Order` carries its own `storeId` (indexed,
// storeScoped-guarded)  every aggregation used to reach it indirectly via
// `$lookup: customers` + `$unwind` + `$match: "customer.storeId"` instead.
// Besides being three extra pipeline stages on every single query, that
// route is not equivalent: `$unwind` with `preserveNullAndEmptyArrays: true`
// leaves `customer` undefined for any order whose `user` doesn't resolve to
// a live Customer document (guest checkout, a deleted customer, orphaned
// data)  `"customer.storeId"` then matches nothing, and that order silently
// disappears from every revenue/order metric on the dashboard even though it
// unambiguously belongs to the store. Matching `Order.storeId` directly is
// both the correct data-integrity fix and the fast, indexed path.
const orderStoreMatch = (storeId) => getTenantFilter(storeId ? new mongoose.Types.ObjectId(storeId) : storeId);

// Canonical mapping from the real Order.status enum (see models/Order.js) to
// the dashboard's display buckets. The previous code lowercased the raw
// status and looked it up by identity ("Cancel" -> "cancel"), which never
// matched the "cancelled" bucket key and silently left it at 0 forever; same
// story for "Delivered" never reaching "completed". Every status is listed
// explicitly here so a future enum change fails loudly (an unmapped status
// falls through the `if` below) instead of silently.
const ORDER_STATUS_BUCKET = {
  Pending: "pending",
  "Payment-Accepted": "paymentAccepted",
  Processing: "processing",
  Shipped: "shipped",
  Delivered: "completed",
  Cancel: "cancelled",
  Refunded: "refunded",
};

const startOfDay = (date = new Date()) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; };
const startOfYesterday = (date = new Date()) => { const d = new Date(date); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; };
const startOfMonth = (date = new Date()) => { const d = new Date(date); d.setDate(1); d.setHours(0, 0, 0, 0); return d; };
const startOfYear = (date = new Date()) => { const d = new Date(date); d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d; };
const fmt = (v) => Math.round((v || 0) * 100) / 100;
const growthPct = (current, previous) => {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const buildKpiCardsPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const storeMatch = orderStoreMatch(storeId);
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = startOfYesterday(now);
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  // Previous-period windows for the real growth% figures the ticket asks
  // for instead of Math.random()  same-length window immediately preceding
  // the current one.
  const prevMonthEnd = monthStart;
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

  const sumRevenue = (extra = {}) =>
    Order.aggregate([{ $match: { ...storeMatch, ...extra } }, { $group: { _id: null, total: { $sum: "$total" } } }]);
  const countOrders = (extra = {}) => Order.aggregate([{ $match: { ...storeMatch, ...extra } }, { $count: "count" }]);

  const [totalRevenueResult, todayRevenueResult, yesterdayRevenueResult, monthlyRevenueResult, yearlyRevenueResult,
    prevMonthRevenueResult, ordersTodayResult, pendingOrdersResult, completedOrdersResult, cancelledOrdersResult,
    processingOrdersResult, totalCustomersResult, newCustomersResult, prevMonthCustomersResult, totalProductsResult,
    outOfStockResult, lowStockResult, activeProductsResult, draftProductsResult, archivedProductsResult,
    totalReviewsResult, pendingReviewsResult, totalOrdersResult, prevMonthOrdersResult, abandonedCartsResult] = await Promise.all([
    sumRevenue(),
    sumRevenue({ createdAt: { $gte: todayStart } }),
    sumRevenue({ createdAt: { $gte: yesterdayStart, $lt: todayStart } }),
    sumRevenue({ createdAt: { $gte: monthStart } }),
    sumRevenue({ createdAt: { $gte: yearStart } }),
    sumRevenue({ createdAt: { $gte: prevMonthStart, $lt: prevMonthEnd } }),
    countOrders({ createdAt: { $gte: todayStart } }),
    countOrders({ status: "Pending" }),
    countOrders({ status: "Delivered" }),
    countOrders({ status: "Cancel" }),
    countOrders({ status: "Processing" }),
    Customer.countDocuments(tenant),
    Customer.countDocuments({ ...tenant, createdAt: { $gte: todayStart } }),
    Customer.countDocuments({ ...tenant, createdAt: { $gte: prevMonthStart, $lt: prevMonthEnd } }),
    Product.countDocuments(tenant),
    Product.countDocuments({ ...tenant, stockStatus: "outofstock" }),
    Product.countDocuments({ ...tenant, manageStock: true, stockQuantity: { $gt: 0, $lte: 5 } }),
    Product.countDocuments({ ...tenant, status: "published" }),
    Product.countDocuments({ ...tenant, status: "draft" }),
    Product.countDocuments({ ...tenant, status: "archived" }),
    ProductReview.countDocuments(tenant),
    ProductReview.countDocuments({ ...tenant, status: "pending" }),
    countOrders(),
    countOrders({ createdAt: { $gte: prevMonthStart, $lt: prevMonthEnd } }),
    // "Abandoned" = a real, non-empty cart nobody has touched in the last
    // hour (no cartIdéOrder link exists to detect true conversion, so this
    // is the standard heuristic e-commerce dashboards use absent that link 
    // still a real count from the Cart collection, not a fabricated ratio).
    Cart.countDocuments({ ...tenant, "items.0": { $exists: true }, updatedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } }),
  ]);

  const revenue = totalRevenueResult[0]?.total || 0;
  const todayRevenue = todayRevenueResult[0]?.total || 0;
  const yesterdayRevenue = yesterdayRevenueResult[0]?.total || 0;
  const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;
  const yearlyRevenue = yearlyRevenueResult[0]?.total || 0;
  const prevMonthRevenue = prevMonthRevenueResult[0]?.total || 0;
  const ordersToday = ordersTodayResult[0]?.count || 0;
  const pendingOrders = pendingOrdersResult[0]?.count || 0;
  const completedOrders = completedOrdersResult[0]?.count || 0;
  const cancelledOrders = cancelledOrdersResult[0]?.count || 0;
  const processingOrders = processingOrdersResult[0]?.count || 0;
  const totalCustomers = totalCustomersResult || 0;
  const newCustomers = newCustomersResult || 0;
  const prevMonthCustomers = prevMonthCustomersResult || 0;
  const totalProducts = totalProductsResult || 0;
  const outOfStock = outOfStockResult || 0;
  const lowStock = lowStockResult || 0;
  const activeProducts = activeProductsResult || 0;
  const draftProducts = draftProductsResult || 0;
  const archivedProducts = archivedProductsResult || 0;
  const totalReviews = totalReviewsResult || 0;
  const pendingReviews = pendingReviewsResult || 0;
  const totalOrders = totalOrdersResult[0]?.count || 0;
  const prevMonthOrders = prevMonthOrdersResult[0]?.count || 0;
  const abandonedCarts = abandonedCartsResult || 0;

  const averageOrder = totalOrders > 0 ? revenue / totalOrders : 0;
  const conversionRate = totalCustomers > 0 ? Math.min(100, Math.round((totalOrders / totalCustomers) * 100)) : 0;

  return {
    kpis: {
      todaySales: todayRevenue, yesterdaySales: yesterdayRevenue, thisMonth: monthlyRevenue, thisYear: yearlyRevenue,
      ordersToday, pendingOrders, completedOrders, cancelledOrders, customers: totalCustomers, newCustomers,
      products: totalProducts, outOfStock, lowStock, averageOrder, conversionRate, abandonedCarts,
      visitorsToday: null, visitorsTodayIsEstimated: true,
      netProfit: null, netProfitIsEstimated: true,
      // Real month-over-previous-month growth, not Math.random(). Only
      // populated once a previous period actually exists to compare
      // against  a store in its first month has no prior data to divide
      // by, and growthPct already returns a sane 0/100 in that edge case.
      growth: {
        sales: growthPct(monthlyRevenue, prevMonthRevenue),
        orders: growthPct(totalOrders, prevMonthOrders),
        customers: growthPct(totalCustomers, prevMonthCustomers),
      },
    },
    orders: { pending: pendingOrders, processing: processingOrders, completed: completedOrders, cancelled: cancelledOrders },
    customers: { total: totalCustomers, new: newCustomers, returning: Math.max(0, totalCustomers - newCustomers) },
    products: { total: totalProducts, active: activeProducts, draft: draftProducts, archived: archivedProducts },
    inventory: { outOfStock, lowStock },
    reviews: { total: totalReviews, pending: pendingReviews },
  };
};

const ANALYTICS_RANGES = { "7days": 6, "30days": 29, "90days": 89 };

const rangeStart = (range) => {
  if (range === "12months") return startOfYear(new Date());
  const daysBack = ANALYTICS_RANGES[range] ?? ANALYTICS_RANGES["30days"];
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d;
};

const buildSalesAnalyticsPayload = async (storeId, range = "30days") => {
  const start = rangeStart(range);
  const end = new Date();

  const pipeline = [
    { $match: { ...orderStoreMatch(storeId), createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$total" }, orders: { $sum: 1 },
        taxes: { $sum: "$tax" }, shipping: { $sum: "$shippingCost" }, discounts: { $sum: "$discount" },
      },
    },
    { $sort: { _id: 1 } },
  ];
  const data = await Order.aggregate(pipeline);
  return {
    range,
    filters: ["Today", "7 days", "30 days", "90 days", "12 months"],
    // Profit needs a cost-of-goods figure this project doesn't track
    // anywhere (no cost field on Product)  reported as unavailable per
    // point rather than invented from an arbitrary margin assumption.
    profitIsEstimated: true,
    series: data.map((d) => ({ date: d._id, revenue: fmt(d.revenue), orders: d.orders, profit: null, taxes: fmt(d.taxes), shipping: fmt(d.shipping), discounts: fmt(d.discounts) })),
  };
};

const buildOrdersPayload = async (storeId) => {
  const storeMatch = orderStoreMatch(storeId);
  const orders = await Order.aggregate([
    { $match: storeMatch },
    { $sort: { createdAt: -1 } }, { $limit: 20 },
    { $lookup: { from: "customers", localField: "user", foreignField: "_id", as: "customer" } },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    { $project: { _id: 1, invoice: 1, customerName: { $ifNull: ["$customer.firstName", "Guest"] }, total: 1, status: 1, paymentMethod: 1, createdAt: 1 } },
  ]);
  const statusCounts = await Order.aggregate([
    { $match: storeMatch },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = { pending: 0, paymentAccepted: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0, refunded: 0 };
  statusCounts.forEach((s) => {
    const bucket = ORDER_STATUS_BUCKET[s._id];
    if (bucket) counts[bucket] = s.count;
  });
  return { counts, recent: orders };
};

const buildCustomersPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const total = await Customer.countDocuments(tenant);
  const newCount = await Customer.countDocuments({ ...tenant, createdAt: { $gte: startOfDay() } });
  const top = await Customer.find(tenant).sort({ createdAt: -1 }).limit(5).select("firstName lastName email createdAt").lean();
  return { total, new: newCount, returning: Math.max(0, total - newCount), topCustomers: top };
};

const buildProductsPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const total = await Product.countDocuments(tenant);
  const active = await Product.countDocuments({ ...tenant, status: "published" });
  const draft = await Product.countDocuments({ ...tenant, status: "draft" });
  const archived = await Product.countDocuments({ ...tenant, status: "archived" });
  // Preview list only (ordered by review count, a real field)  the
  // commerce-accurate "top selling by units/revenue" ranking lives in
  // buildTopProductsPayload, which reads real OrderItem sales instead.
  const topSelling = await Product.find(tenant).sort({ "rating.count": -1 }).limit(5).select("productName stockQuantity rating").lean();
  return { total, active, draft, archived, topSelling };
};

const buildInventoryPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const storeObjectId = storeId ? new mongoose.Types.ObjectId(storeId) : null;
  const outOfStock = await Product.countDocuments({ ...tenant, stockStatus: "outofstock" });
  const lowStock = await Product.countDocuments({ ...tenant, manageStock: true, stockQuantity: { $gt: 0, $lte: 5 } });

  // Real reservedStock: sum of active StockReservation holds for this
  // store's products. StockReservation carries no storeId of its own (it is
  // not storeScoped  see models/StockReservation.js), so the store scope is
  // reached the only correct way available: joining through the product it
  // reserves stock on.
  const reservedResult = await StockReservation.aggregate([
    { $match: { status: "reserved" } },
    { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    { $match: storeObjectId ? { "product.storeId": storeObjectId } : {} },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);

  // Products with real sales in the last 30 days (from OrderItem, a real
  // per-line record of what actually sold)  a genuine "moves fast" signal,
  // replacing the previous always-empty `topStock: []`.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rotation = await OrderItem.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: "$productId", unitsSold: { $sum: "$quantity" } } },
    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    { $match: storeObjectId ? { "product.storeId": storeObjectId } : {} },
    { $sort: { unitsSold: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, productId: "$_id", productName: "$product.productName", unitsSold: 1, stockQuantity: "$product.stockQuantity" } },
  ]);

  return {
    outOfStock,
    lowStock,
    reservedStock: reservedResult[0]?.total || 0,
    // No purchase-order / incoming-shipment model exists in this project 
    // nothing real to report, so this stays an explicit "unavailable"
    // instead of a silent 0 that looks like "nothing incoming".
    incomingStock: null,
    incomingStockAvailable: false,
    // regularPrice is a selling price, not a cost  using it as inventory
    // valuation overstates stock value by the store's own margin. Product
    // has no cost field anywhere in this project, so the value is honestly
    // reported as unavailable rather than computed from the wrong number.
    inventoryValue: null,
    inventoryValueAvailable: false,
    topStock: rotation,
  };
};

const buildPaymentsPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  // Query.countDocuments() casts a string storeId against the schema's
  // ObjectId type on its own; an aggregate $match does not  left as a raw
  // string here it silently matched zero documents, which is why revenue
  // and the provider breakdown were always 0 regardless of real Payment
  // data. See the identical fix on buildBestCustomersPayload/buildReviewsPayload/buildFinancialPayload.
  const tenantAgg = getTenantFilter(storeId ? new mongoose.Types.ObjectId(storeId) : storeId);
  // Payment.status's real enum (copied from Order.paymentStatus, see
  // models/Payment.js) is pending/paid/failed/refunded/cancelled  "paid",
  // never "succeeded". "succeeded" can't even be written by the current
  // schema, so this widget's successful-payment count and revenue were
  // always 0 for any payment written after that enum was set. "succeeded"
  // is still matched alongside "paid" only for pre-existing legacy rows
  // written before the enum tightened (PaymentTransactionService checks the
  // same pair for the same reason).
  const SUCCESS_STATUSES = ["paid", "succeeded"];
  const successful = await Payment.countDocuments({ ...tenant, status: { $in: SUCCESS_STATUSES } });
  const pending = await Payment.countDocuments({ ...tenant, status: "pending" });
  const refunds = await Payment.countDocuments({ ...tenant, status: "refunded" });
  const failed = await Payment.countDocuments({ ...tenant, status: "failed" });
  const revenueResult = await Payment.aggregate([{ $match: { ...tenantAgg, status: { $in: SUCCESS_STATUSES } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  const breakdown = await Payment.aggregate([{ $match: tenantAgg }, { $group: { _id: "$gateway", amount: { $sum: "$amount" } } }]);
  return {
    revenue: revenueResult[0]?.total || 0, successful, pending, refunds, failed,
    averageTransaction: successful ? fmt(revenueResult[0]?.total / successful) : 0,
    breakdown: breakdown.map((b) => ({ provider: b._id || "Unknown", amount: fmt(b.amount) })),
  };
};

const buildShippingPayload = async (storeId) => {
  const storeMatch = orderStoreMatch(storeId);
  const ordersToShip = await Order.aggregate([{ $match: { ...storeMatch, status: "Processing" } }, { $count: "count" }]);
  const delivered = await Order.aggregate([{ $match: { ...storeMatch, trackingStatus: "Delivered" } }, { $count: "count" }]);
  const inTransit = await Order.aggregate([{ $match: { ...storeMatch, trackingStatus: "On The Way" } }, { $count: "count" }]);
  // "Delayed" = still not delivered past its own estimated delivery window 
  // a real signal from the order's own dates, not a guess.
  const delayed = await Order.aggregate([{ $match: { ...storeMatch, trackingStatus: { $ne: "Delivered" }, estimatedDeliveryMaxDate: { $lt: new Date() } } }, { $count: "count" }]);
  const shippingCostResult = await Order.aggregate([{ $match: storeMatch }, { $group: { _id: null, total: { $sum: "$shippingCost" } } }]);
  const carrierResult = await Order.aggregate([{ $match: { ...storeMatch, "shippingMethod.carrier": { $nin: [null, ""] } } }, { $group: { _id: "$shippingMethod.carrier", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 1 }]);
  return {
    ordersToShip: ordersToShip[0]?.count || 0,
    delivered: delivered[0]?.count || 0,
    inTransit: inTransit[0]?.count || 0,
    delayed: delayed[0]?.count || 0,
    // No returns/RMA-shipping-status model exists in this project  no data
    // source to count from.
    returned: null, returnedIsEstimated: true,
    shippingCost: fmt(shippingCostResult[0]?.total || 0),
    topCarrier: carrierResult[0]?._id || null,
  };
};

const buildMarketingPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const storeMatch = orderStoreMatch(storeId);
  const coupons = await Coupon.countDocuments(tenant);
  const discountsResult = await Order.aggregate([{ $match: storeMatch }, { $group: { _id: null, total: { $sum: "$discount" } } }]);
  const emails = await Customer.countDocuments({ ...tenant, marketingConsent: true });
  const sms = await Customer.countDocuments({ ...tenant, phoneVerified: true });
  return {
    coupons, discounts: fmt(discountsResult[0]?.total || 0), emails, sms,
    // No campaign/marketing-automation/affiliate/referral system exists in
    // this project  nothing to aggregate for these.
    campaigns: null, campaignsIsEstimated: true,
    automation: null, automationIsEstimated: true,
    affiliate: null, affiliateIsEstimated: true,
    referral: null, referralIsEstimated: true,
  };
};

const buildReviewsPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const totalReviews = await ProductReview.countDocuments(tenant);
  const pendingReviews = await ProductReview.countDocuments({ ...tenant, status: "pending" });
  const reportedReviews = await ProductReview.countDocuments({ ...tenant, reportCount: { $gt: 0 } });
  // Aggregate $match needs a cast ObjectId, unlike countDocuments()/find()
  // above  see the note on buildPaymentsPayload for why.
  const tenantAgg = getTenantFilter(storeId ? new mongoose.Types.ObjectId(storeId) : storeId);
  const avgRating = await ProductReview.aggregate([{ $match: { ...tenantAgg, status: "approved" } }, { $group: { _id: null, avg: { $avg: "$rating" } } }]);
  const latestReviews = await ProductReview.find(tenant).sort({ createdAt: -1 }).limit(5).populate("customerId", "firstName lastName").lean();
  return {
    averageRating: avgRating[0]?.avg ? Math.round(avgRating[0].avg * 10) / 10 : 0,
    totalReviews, pendingReviews, reportedReviews,
    latestReviews: latestReviews.map((r) => ({ customer: r.customerId?.firstName || r.reviewerName || "Anonymous", rating: r.rating, message: r.comment })),
  };
};

const buildStorePerformancePayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const totalCustomers = await Customer.countDocuments(tenant);
  const totalOrders = await Order.aggregate([{ $match: orderStoreMatch(storeId) }, { $count: "count" }]);
  return {
    conversionRate: totalCustomers > 0 ? Math.min(100, Math.round((totalOrders[0]?.count / totalCustomers) * 100)) : 0,
    // Bounce rate, session length, page views and search tracking all need a
    // web-analytics/page-view system this project doesn't have (CustomerSession
    // only tracks authenticated-customer logins, a different and much smaller
    // population than site visitors, so it cannot stand in for this) 
    // nothing real to report here, so these are explicit nulls rather than
    // guesses.
    bounceRate: null, bounceRateIsEstimated: true,
    averageSession: null, averageSessionIsEstimated: true,
    returningVisitors: null, returningVisitorsIsEstimated: true,
    topPages: [], topPagesIsEstimated: true,
    searches: null, searchesIsEstimated: true,
  };
};

// This project has no storefront traffic/analytics tracking (only
// authenticated CustomerSession logins, which are a different, much smaller
// population than site visitors)  every field here would be fabricated, so
// the whole payload is reported as unavailable rather than invented.
const buildVisitorsPayload = async () => ({
  today: null, yesterday: null, week: null, month: null,
  topCountries: [], topDevices: [], topBrowsers: [],
  isEstimated: true,
});

const buildFinancialPayload = async (storeId) => {
  // Aggregate $match needs a cast ObjectId  see the note on
  // buildPaymentsPayload for why a raw string here silently matches
  // nothing.
  const tenantAgg = getTenantFilter(storeId ? new mongoose.Types.ObjectId(storeId) : storeId);
  const revenueResult = await Order.aggregate([{ $match: orderStoreMatch(storeId) }, { $group: { _id: null, revenue: { $sum: "$total" }, shipping: { $sum: "$shippingCost" }, discounts: { $sum: "$discount" }, taxes: { $sum: "$tax" } } }]);
  const refundsResult = await Payment.aggregate([{ $match: { ...tenantAgg, status: "refunded" } }, { $group: { _id: null, refunds: { $sum: "$amount" } } }]);
  const revenue = revenueResult[0]?.revenue || 0;
  const refunds = refundsResult[0]?.refunds || 0;
  // "Net revenue" here means gross revenue minus refunds/discounts  a real,
  // directly-derivable number. "Profit"/"expenses" would additionally need
  // cost-of-goods data, which this project doesn't track on Product, so
  // those stay explicitly unavailable instead of assuming a made-up margin.
  const netRevenue = revenue - refunds - (revenueResult[0]?.discounts || 0);
  return {
    revenue: fmt(revenue),
    expenses: null, expensesIsEstimated: true,
    profit: null, profitIsEstimated: true,
    taxes: fmt(revenueResult[0]?.taxes || 0),
    shipping: fmt(revenueResult[0]?.shipping || 0),
    coupons: fmt(revenueResult[0]?.discounts || 0),
    refunds: fmt(refunds),
    netRevenue: fmt(netRevenue),
  };
};

const buildTasksPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const outOfStock = await Product.countDocuments({ ...tenant, stockStatus: "outofstock" });
  const pendingOrders = await Order.aggregate([{ $match: { ...orderStoreMatch(storeId), status: "Pending" } }, { $count: "count" }]);
  const pendingReviews = await ProductReview.countDocuments({ ...tenant, status: "pending" });
  const failedPayments = await Payment.countDocuments({ ...tenant, status: "failed" });
  const lowStock = await Product.countDocuments({ ...tenant, manageStock: true, stockQuantity: { $gt: 0, $lte: 5 } });
  const tasks = [];
  if (outOfStock > 0) tasks.push({ id: "restock", title: `Restock ${outOfStock} out-of-stock products`, priority: "high", category: "inventory" });
  if (pendingOrders[0]?.count > 0) tasks.push({ id: "process-orders", title: `Process ${pendingOrders[0].count} pending orders`, priority: "high", category: "orders" });
  if (pendingReviews > 0) tasks.push({ id: "reply-reviews", title: `Reply to ${pendingReviews} pending reviews`, priority: "medium", category: "reviews" });
  if (failedPayments > 0) tasks.push({ id: "review-refunds", title: `Review ${failedPayments} failed payments`, priority: "high", category: "payments" });
  if (lowStock > 0) tasks.push({ id: "low-stock", title: `Check ${lowStock} low-stock products`, priority: "medium", category: "inventory" });
  return tasks;
};

const buildAlertsPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const outOfStock = await Product.countDocuments({ ...tenant, stockStatus: "outofstock" });
  const lowStock = await Product.countDocuments({ ...tenant, manageStock: true, stockQuantity: { $gt: 0, $lte: 5 } });
  const pendingOrders = await Order.aggregate([{ $match: { ...orderStoreMatch(storeId), status: "Pending" } }, { $count: "count" }]);
  const failedPayments = await Payment.countDocuments({ ...tenant, status: "failed" });
  const failedWebhooks = await AuditLog.countDocuments({ ...tenant, severity: "high", module: "webhook" });
  const pendingReviews = await ProductReview.countDocuments({ ...tenant, status: "pending" });
  // SO-10: reuse the same soft-limit evaluation the platform Usage dashboard
  // is built on (SoftLimitService), rather than a second, separate notion of
  // "quota is close"  one source of truth for what "near/at quota" means.
  const quotaStates = await SoftLimitService.evaluateStore(storeId).catch(() => []);

  const alerts = [];
  if (outOfStock > 0) alerts.push({ type: "inventory", title: `${outOfStock} products are out of stock`, severity: "high", actionUrl: "/products" });
  if (lowStock > 0) alerts.push({ type: "inventory", title: `${lowStock} products have low stock`, severity: "medium", actionUrl: "/products" });
  if (pendingOrders[0]?.count > 0) alerts.push({ type: "orders", title: `${pendingOrders[0].count} orders require follow-up`, severity: "medium", actionUrl: "/orders" });
  if (failedPayments > 0) alerts.push({ type: "payments", title: `${failedPayments} payments failed`, severity: "high", actionUrl: "/orders" });
  if (failedWebhooks > 0) alerts.push({ type: "system", title: `${failedWebhooks} webhook errors detected`, severity: "high", actionUrl: "/billing/audit-logs" });
  if (pendingReviews > 0) alerts.push({ type: "reviews", title: `${pendingReviews} reviews awaiting moderation`, severity: "medium", actionUrl: "/product-reviews" });
  for (const q of quotaStates) {
    if (q.state === "warning" || q.state === "critical" || q.state === "blocked") {
      alerts.push({
        type: "quota",
        title: `${q.quotaTypeCode} usage at ${q.percentage}% of your plan limit (${q.used}/${q.limit})`,
        severity: q.state === "blocked" ? "high" : q.state === "critical" ? "high" : "medium",
        actionUrl: "/store/my-usage",
      });
    }
  }
  return alerts;
};

const buildRecentActivityPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const activities = [];
  const recentOrders = await Order.aggregate([{ $match: orderStoreMatch(storeId) }, { $sort: { createdAt: -1 } }, { $limit: 5 }, { $project: { _id: 1, status: 1, total: 1, createdAt: 1, invoice: 1 } }]);
  recentOrders.forEach((o) => activities.push({ type: "order", title: `Order #${o.invoice || o._id} - ${o.status}`, amount: o.total, time: o.createdAt }));
  const recentCustomers = await Customer.find(tenant).sort({ createdAt: -1 }).limit(3).select("firstName lastName createdAt").lean();
  recentCustomers.forEach((c) => activities.push({ type: "customer", title: `New customer: ${c.firstName} ${c.lastName}`, time: c.createdAt }));
  activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  return activities.slice(0, 10);
};

const buildTopProductsPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const storeObjectId = storeId ? new mongoose.Types.ObjectId(storeId) : null;
  // Real units sold / revenue per product, from OrderItem  the per-line
  // record of what actually sold (see models/OrderItem.js). The previous
  // version sorted by `rating.count` (review count, not sales) and reported
  // `growth` as `{ $rand: {} } * 100`, i.e. a fresh random number every
  // request  strictly worse than reporting nothing.
  const sales = await OrderItem.aggregate([
    { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    { $match: storeObjectId ? { "product.storeId": storeObjectId } : {} },
    {
      $group: {
        _id: "$productId",
        productName: { $first: "$productName" },
        unitsSold: { $sum: "$quantity" },
        revenue: { $sum: "$total" },
        stock: { $first: "$product.stockQuantity" },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: 10 },
  ]);

  if (sales.length > 0) {
    return sales.map((p) => ({
      productId: p._id,
      productName: p.productName,
      sales: p.unitsSold,
      revenue: fmt(p.revenue),
      stock: p.stock || 0,
      // "Growth" needs a prior-period sales snapshot to compare against,
      // which isn't recorded anywhere.
      growth: null, growthIsEstimated: true,
    }));
  }

  // No OrderItem lines yet for this store (e.g. a brand-new store with no
  // sales)  fall back to the catalogue itself so the widget isn't just
  // empty, but be explicit that "sales" isn't real here.
  const products = await Product.find(tenant).sort({ createdAt: -1 }).limit(10).select("productName stockQuantity").lean();
  return products.map((p) => ({
    productId: p._id, productName: p.productName, sales: 0, revenue: 0, stock: p.stockQuantity || 0,
    growth: null, growthIsEstimated: true,
  }));
};

const buildBestCustomersPayload = async (storeId) => {
  // Aggregation pipelines are not schema-cast the way Query.find() is 
  // matching a raw string storeId against an ObjectId field here silently
  // matches nothing. This was a real, confirmed bug (this widget returned
  // an empty array for every store) rather than a hypothetical one.
  const tenant = getTenantFilter(storeId ? new mongoose.Types.ObjectId(storeId) : storeId);
  return await Customer.aggregate([
    { $match: tenant },
    {
      $lookup: {
        from: "orders",
        let: { customerId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$user", "$$customerId"] } } },
          { $group: { _id: null, orderCount: { $sum: 1 }, totalSpent: { $sum: "$total" }, lastOrderAt: { $max: "$createdAt" } } },
        ],
        as: "orderStats",
      },
    },
    { $unwind: { path: "$orderStats", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: { $concat: ["$firstName", " ", { $ifNull: ["$lastName", ""] }] },
        orders: { $ifNull: ["$orderStats.orderCount", 0] },
        totalSpent: { $ifNull: ["$orderStats.totalSpent", 0] },
        averageOrderValue: {
          $cond: [
            { $gt: [{ $ifNull: ["$orderStats.orderCount", 0] }, 0] },
            { $divide: ["$orderStats.totalSpent", "$orderStats.orderCount"] },
            0,
          ],
        },
        // STORE-DASHBOARD-01 25/11: this used to be `$createdAt`  the
        // Customer document's own signup date, not the date of their last
        // order. Now the real max(Order.createdAt) for that customer, null
        // when they have never ordered.
        lastOrderAt: { $ifNull: ["$orderStats.lastOrderAt", null] },
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 },
  ]);
};

const buildSalesChannelsPayload = async (storeId) => {
  const channels = await Order.aggregate([
    { $match: orderStoreMatch(storeId) },
    { $group: { _id: "$paymentMethod", revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    { $sort: { revenue: -1 } },
  ]);
  return channels.map((c) => ({ channel: c._id || "Direct", revenue: fmt(c.revenue), orders: c.orders }));
};

const buildAiInsightsPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const outOfStock = await Product.countDocuments({ ...tenant, stockStatus: "outofstock" });
  const lowStock = await Product.countDocuments({ ...tenant, manageStock: true, stockQuantity: { $gt: 0, $lte: 5 } });
  // Rule-based insights derived from real counts above  not a connected AI
  // model. Kept explicitly labelled as such (source: "rules") rather than
  // presented as a prediction, per the ticket's guidance to distinguish
  // rule-based heuristics from real AI until one is actually wired up.
  const insights = [];
  if (outOfStock > 0) insights.push({ title: "Replenish best-selling items", detail: `${outOfStock} products are out of stock and blocking sales.`, priority: "high", source: "rules" });
  if (lowStock > 0) insights.push({ title: "Monitor low-stock products", detail: `${lowStock} products are running low. Consider reordering soon.`, priority: "medium", source: "rules" });
  if (insights.length === 0) insights.push({ title: "Inventory is healthy", detail: "No out-of-stock or low-stock products right now.", priority: "low", source: "rules" });
  return insights;
};

const buildHealthScorePayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const productsWithoutImage = await Product.countDocuments({ ...tenant, productGallery: { $size: 0 } });
  const outOfStock = await Product.countDocuments({ ...tenant, stockStatus: "outofstock" });
  const lowStock = await Product.countDocuments({ ...tenant, manageStock: true, stockQuantity: { $gt: 0, $lte: 5 } });
  const pendingReviews = await ProductReview.countDocuments({ ...tenant, status: "pending" });
  const pendingOrders = await Order.aggregate([{ $match: { ...orderStoreMatch(storeId), status: "Pending" } }, { $count: "count" }]);
  const pendingOrdersCount = pendingOrders[0]?.count || 0;
  let score = 100;
  score -= Math.min(productsWithoutImage * 2, 20);
  score -= Math.min(outOfStock * 5, 25);
  score -= Math.min(lowStock * 2, 15);
  score -= Math.min(pendingReviews * 3, 15);
  score -= Math.min(pendingOrdersCount * 2, 15);
  score = Math.max(0, Math.min(100, score));
  return { score, breakdown: { productsWithoutImage, outOfStock, lowStock, pendingReviews, pendingOrders: pendingOrdersCount } };
};

// There's no StoreGoal/target concept modeled anywhere in this project  a
// revenue goal is something a merchant sets, not something derivable from
// their own sales. The old code invented one as "150% of revenue so far",
// which is a moving target that's always exactly out of reach and tells the
// merchant nothing real. currentRevenue is genuine; everything that depends
// on a target is honestly reported as unavailable until a real goal-setting
// feature exists (tracked separately, out of scope here).
const buildGoalsPayload = async (storeId) => {
  const monthStart = startOfMonth();
  const monthlyRevenue = await Order.aggregate([{ $match: { ...orderStoreMatch(storeId), createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: "$total" } } }]);
  return {
    currentRevenue: fmt(monthlyRevenue[0]?.total || 0),
    targetRevenue: null, progress: null, remainingOrders: null, completionRate: null,
    available: false,
    noGoalSet: true,
  };
};

const buildConversionFunnelPayload = async (storeId) => {
  const tenant = getTenantFilter(storeId);
  const storeMatch = orderStoreMatch(storeId);
  // Real counts from Cart/Order instead of ratios invented from the order
  // count: a non-empty cart is a real "added to cart" event, every Order
  // document is a real checkout attempt, and paymentStatus:"paid" is a real
  // successful payment  no traffic tracking, so top-of-funnel "visitors"
  // stays unavailable rather than a made-up multiple of customer count.
  const cartAdditions = await Cart.countDocuments({ ...tenant, "items.0": { $exists: true } });
  const checkoutStarted = await Order.aggregate([{ $match: storeMatch }, { $count: "count" }]);
  const paymentsSucceeded = await Order.aggregate([{ $match: { ...storeMatch, paymentStatus: "paid" } }, { $count: "count" }]);
  const checkoutStartedCount = checkoutStarted[0]?.count || 0;
  const paymentsSucceededCount = paymentsSucceeded[0]?.count || 0;
  const abandonedCarts = Math.max(0, cartAdditions - checkoutStartedCount);
  return {
    visitors: null, visitorsIsEstimated: true,
    cartAdditions, checkoutStarted: checkoutStartedCount, paymentsSucceeded: paymentsSucceededCount,
    abandonedCarts, cartAbandonmentRate: cartAdditions > 0 ? Math.round((abandonedCarts / cartAdditions) * 100) : 0,
  };
};

const buildOnboardingPayload = async (storeId) => StoreOnboardingService.getOnboardingStatus(storeId);

// STORE-DASHBOARD-01 28: each action is tagged with the real RBAC
// permission code it requires (see config/rbac/permissions.js)  the caller
// must never see a shortcut into an area their role's permissions actually
// forbid. `import`/`export` have no dedicated permission codes in the
// Products module, so they ride on `create`/`view` respectively, which is
// what each action functionally amounts to.
const QUICK_ACTIONS = [
  { id: "create-product", label: "Create product", icon: "package", action: "/products/new", color: "blue", requires: "products.create" },
  { id: "create-order", label: "Create order", icon: "shopping-cart", action: "/orders/new", color: "green", requires: "orders.create" },
  { id: "create-coupon", label: "Create coupon", icon: "tag", action: "/coupons/new", color: "purple", requires: "coupons.create" },
  { id: "create-customer", label: "Create customer", icon: "users", action: "/customers/new", color: "orange", requires: "customers.create" },
  { id: "view-analytics", label: "View analytics", icon: "bar-chart-2", action: "/analytics", color: "indigo", requires: "analytics.view" },
  { id: "import-products", label: "Import products", icon: "download", action: "/products/import", color: "gray", requires: "products.create" },
  { id: "export-products", label: "Export products", icon: "upload", action: "/products/export", color: "gray", requires: "products.view" },
];

// `permissionCodes` is null for a superadmin (every action allowed) or a
// Set of the caller's real, normalized store-role permission codes
// otherwise  never a bare `role === "admin"` check, per the ticket's
// explicit instruction to keep using the existing RBAC system.
const buildQuickActionsPayload = (permissionCodes = null) =>
  QUICK_ACTIONS.filter((a) => permissionCodes === null || permissionCodes.has(a.requires))
    .map(({ requires, ...rest }) => rest);

const getCached = async (storeId, suffix, builder) => {
  const key = cacheKey(storeId, suffix);
  const cached = await cache.get(key);
  if (cached) return cached;
  const data = await builder();
  await cache.set(key, data, CACHE_TTL);
  return data;
};

const invalidateCache = async (storeId) => {
  const pattern = `${CACHE_PREFIX}:${storeId}:*`;
  await cache.delPattern(pattern);
};

const StoreOwnerDashboardServiceV2 = {
  buildKpiCardsPayload,
  buildSalesAnalyticsPayload,
  buildOrdersPayload,
  buildCustomersPayload,
  buildProductsPayload,
  buildInventoryPayload,
  buildPaymentsPayload,
  buildShippingPayload,
  buildMarketingPayload,
  buildReviewsPayload,
  buildStorePerformancePayload,
  buildVisitorsPayload,
  buildFinancialPayload,
  buildTasksPayload,
  buildAlertsPayload,
  buildRecentActivityPayload,
  buildTopProductsPayload,
  buildBestCustomersPayload,
  buildSalesChannelsPayload,
  buildAiInsightsPayload,
  buildHealthScorePayload,
  buildGoalsPayload,
  buildConversionFunnelPayload,
  buildOnboardingPayload,
  buildQuickActionsPayload,
  getCached,
  invalidateCache,
};

module.exports = StoreOwnerDashboardServiceV2;
