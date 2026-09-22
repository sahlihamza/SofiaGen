/**
 * PlatformDashboardV2Service
 *
 * Enterprise Super Admin Dashboard  extended aggregation service.
 * Builds on the existing PlatformDashboardService while adding the missing
 * analytics sections required for a Shopify-Plus / Stripe-class control room:
 *
 *  - financial analytics (invoices, taxes, discounts, profit, margin, forecast)
 *  - enhanced payments (refunds, chargebacks, by country, success rate)
 *  - enhanced subscriptions (renewals, upgrades, downgrades, MRR/ARR per plan)
 *  - advanced SaaS metrics (Activation Rate, Trial Conversion, CAC, LTV, NRR,
 *    GRR, Churn, Expansion Revenue, MRR Growth, ARPU)
 *  - richer alerts (quota exceeded, storage low, expiring subscriptions, webhook errors)
 *  - normalized providers analytics (Stripe, Flouci, Konnect, Click To Pay, PayPal, Razorpay)
 *  - infrastructure with workers / background jobs / email / SMS / push
 */
const os = require("os");
const mongoose = require("mongoose");
const Store = require("../models/Store");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const PaymentRefund = require("../models/payment/PaymentRefund");
const PaymentProvider = require("../models/payment/PaymentProvider");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const UsageCounter = require("../models/UsageCounter");
const StoreUsage = require("../models/StoreUsage");
const PlatformCoupon = require("../models/PlatformCoupon");
const Product = require("../models/Product");
const Category = require("../models/Category");
const ProductReview = require("../models/ProductReview");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Post = require("../models/Post");
const Overage = require("../models/Overage");
const InvoiceModel = require("../models/Invoice");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const cache = require("../lib/cache");
const EmailQueueJob = require("../models/EmailQueueJob");
const WebhookLog = require("../models/WebhookLog");
const BackupJob = require("../models/BackupJob");
const ExportJob = require("../models/ExportJob");

const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
const startOfLast7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
const startOfLast30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
const startOfLast90Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
const startOfLast365Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 365);

const fmtMoney = (val) => Math.round((val || 0) * 100) / 100;
const pct = (a, b) => {
  if (b > 0) return Math.round(((a - b) / b) * 100);
  return a > 0 ? 100 : 0;
};

/**
 * Builds a { $gte, $lte } date window from the dashboard "range" filter.
 * Supports 7d / 30d / 90d / 12m and custom date pairs.
 */
const buildDateRange = (query = {}) => {
  if (query.startDate && query.endDate) {
    return {
      $gte: new Date(query.startDate),
      $lte: new Date(`${query.endDate}T23:59:59.999`),
    };
  }
  const days = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 }[query.range];
  if (!days) return null;
  return { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
};

/**
 * Builds a storeId filter from the "status", "plan", "country" and "store"
 * global filters. Returns null when no store-level filter is active.
 */
const buildStoreFilter = async (query = {}) => {
  const cond = {};
  if (query.status && query.status !== "all") cond.status = query.status;
  if (query.plan && query.plan !== "all") {
    const planIds = await Plan.find({ name: query.plan }).select("_id").lean();
    cond.planId = { $in: planIds.map((p) => p._id) };
  }
  if (query.country && query.country !== "all") cond.country = query.country;
  if (query.store && query.store !== "all") {
    if (query.store === "with_orders") cond._id = { $in: await storesWithOrders() };
    if (query.store === "no_orders") cond._id = { $nin: await storesWithOrders() };
  }
  return Object.keys(cond).length ? cond : null;
};

/** Returns the array of store _ids that have at least one order. */
const storesWithOrders = async () => {
  const rows = await Order.aggregate([{ $group: { _id: "$storeId" } }]);
  return rows.map((r) => r._id).filter(Boolean);
};

// Known SaaS providers to normalize gateway names
const PROVIDER_ALIASES = {
  stripe: "Stripe",
  flouci: "Flouci",
  konnect: "Konnect",
  clicktopay: "Click To Pay",
  click_to_pay: "Click To Pay",
  clicktpay: "Click To Pay",
  paypal: "PayPal",
  razorpay: "Razorpay",
};

class PlatformDashboardV2Service {
  // ---------------------------------------------------------------------
  // Public per-section accessors (used by dedicated analytics endpoints)
  // ---------------------------------------------------------------------
  async getKPIs(query = {}) { return this._getKPIs(query); }
  async getRevenueAnalytics(query = {}) { return this._getRevenueAnalytics(query); }
  async getStoreAnalytics(query = {}) { return this._getStoreAnalytics(query); }
  async getSubscriptionAnalytics(query = {}) { return this._getSubscriptionAnalytics(query); }
  async getPaymentAnalytics(query = {}) { return this._getPaymentAnalytics(query); }
  async getFinancialAnalytics(query = {}) { return this._getFinancialAnalytics(query); }
  async getAdvancedMetrics(query = {}) { return this._getAdvancedMetrics(query); }
  async getTopStores(limit = 10, query = {}) { return this._getTopStores(limit, query); }
  async getRecentActivity(limit = 30, query = {}) { return this._getRecentActivity(limit, query); }
  async getAlerts(query = {}) { return this._getAlerts(query); }
  async getGeographicAnalytics(query = {}) { return this._getGeographicAnalytics(query); }
  async getProvidersAnalytics(query = {}) { return this._getProvidersAnalytics(query); }
  async getUsageAnalytics(query = {}) { return this._getUsageAnalytics(query); }
  async getPlatformHealth(query = {}) { return this._getPlatformHealth(query); }
  async getInfrastructure(query = {}) { return this._getInfrastructure(query); }
  async getRiskAnalysis(query = {}) { return this._getRiskAnalysis(query); }

// ---------------------------------------------------------------------
  // Full dashboard (aggregates all sections in parallel, cached 45s)
  // ---------------------------------------------------------------------
  async getFullDashboard() {
    const CACHE_KEY = "dashboard:full:v1";
    const cached = await cache.get(CACHE_KEY);
    if (cached) return cached;

    const [
      kpi,
      revenue,
      stores,
      subscriptions,
      payments,
      financial,
      advancedMetrics,
      topStores,
      recentActivity,
      alerts,
      geographic,
      providers,
      usage,
      health,
      infrastructure,
      risk,
    ] = await Promise.all([
      this._getKPIs(),
      this._getRevenueAnalytics(),
      this._getStoreAnalytics(),
      this._getSubscriptionAnalytics(),
      this._getPaymentAnalytics(),
      this._getFinancialAnalytics(),
      this._getAdvancedMetrics(),
      this._getTopStores(),
      this._getRecentActivity(),
      this._getAlerts(),
      this._getGeographicAnalytics(),
      this._getProvidersAnalytics(),
      this._getUsageAnalytics(),
      this._getPlatformHealth(),
      this._getInfrastructure(),
      this._getRiskAnalysis(),
    ]);

    const result = {
      kpi,
      revenue,
      stores,
      subscriptions,
      payments,
      financial,
      advancedMetrics,
      topStores,
      recentActivity,
      alerts,
      geographic,
      providers,
      usage,
      health,
      infrastructure,
      risk,
      generatedAt: now.toISOString(),
    };

    await cache.set(CACHE_KEY, result, 45);
    return result;
  }

  // ---------------------------------------------------------------------
  // KPI
  // ---------------------------------------------------------------------
  async _getKPIs() {
    const [
      totalStores,
      activeStores,
      suspendedStores,
      trialStores,
      archivedStores,
      createdToday,
      createdThisWeek,
      createdThisMonth,
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      totalInvoices,
      paidInvoicesToday,
      totalPayments,
      todayPayments,
      failedPayments,
      pendingPayments,
      totalUsers,
      activeUsers,
      totalProducts,
      totalOrders,
      totalCustomers,
    ] = await Promise.all([
      Store.countDocuments({ deletedAt: null }),
      Store.countDocuments({ status: "active", deletedAt: null }),
      Store.countDocuments({ status: "suspended", deletedAt: null }),
      Store.countDocuments({ subscriptionStatus: "trial", deletedAt: null }),
      Store.countDocuments({ status: "inactive", deletedAt: null }),
      Store.countDocuments({ createdAt: { $gte: startOfToday }, deletedAt: null }),
      Store.countDocuments({ createdAt: { $gte: startOfLast7Days }, deletedAt: null }),
      Store.countDocuments({ createdAt: { $gte: startOfMonth }, deletedAt: null }),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "trial" }),
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: "paid", paidAt: { $gte: startOfToday } }),
      Payment.countDocuments(),
      Payment.countDocuments({ createdAt: { $gte: startOfToday } }),
      Payment.countDocuments({ status: { $in: ["failed"] } }),
      Payment.countDocuments({ status: { $in: ["pending", "processing"] } }),
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ status: "Active", deletedAt: null }),
      Product.countDocuments(),
      Order.countDocuments(),
      Customer.countDocuments(),
    ]);

    const revenueTotals = await Invoice.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          today: { $sum: { $cond: [{ $gte: ["$paidAt", startOfToday] }, "$total", 0] } },
          month: { $sum: { $cond: [{ $gte: ["$paidAt", startOfMonth] }, "$total", 0] } },
        },
      },
    ]);
    const rev = revenueTotals[0] || { total: 0, today: 0, month: 0 };

    const prevMonthRevenue = await Invoice.aggregate([
      { $match: { status: "paid", paidAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const previousMonthTotal = prevMonthRevenue[0]?.total || 0;
    const monthlyGrowth = pct(rev.month, previousMonthTotal || 1);

    const mrr = activeSubscriptions > 0 ? rev.month / Math.max(activeSubscriptions, 1) : 0;
    const arr = mrr * 12;

    const renewalRate = totalSubscriptions > 0
      ? Math.round((activeSubscriptions / totalSubscriptions) * 100)
      : 0;

    const avgOrder = totalOrders > 0 ? rev.total / totalOrders : 0;
    const avgProductsPerStore = totalStores > 0 ? totalProducts / totalStores : 0;

    // API calls & storage from usage counters
    const usageAgg = await UsageCounter.aggregate([
      { $match: { periodEnd: { $gte: startOfMonth } } },
      { $group: { _id: null, apiCalls: { $sum: { $cond: [{ $eq: ["$quotaTypeCode", "api_calls"] }, "$used", 0] } } } },
    ]);

    return {
      stores: {
        total: totalStores,
        active: activeStores,
        suspended: suspendedStores,
        trial: trialStores,
        archived: archivedStores,
      },
      growth: { today: createdToday, week: createdThisWeek, month: createdThisMonth },
      mrr: { value: fmtMoney(mrr), arr: fmtMoney(arr) },
      revenue: {
        total: fmtMoney(rev.total),
        today: fmtMoney(rev.today),
        month: fmtMoney(rev.month),
        monthlyGrowth,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        trial: trialSubscriptions,
        renewalRate,
      },
      payments: { total: totalPayments, today: todayPayments, failed: failedPayments, pending: pendingPayments },
      users: { total: totalUsers, active: activeUsers },
      orders: { total: totalOrders, avgOrder: fmtMoney(avgOrder) },
      customers: { total: totalCustomers },
      products: { total: totalProducts, avgPerStore: Math.round(avgProductsPerStore) },
      apiCalls: usageAgg[0]?.apiCalls || 0,
    };
  }

  // ---------------------------------------------------------------------
  // Revenue Analytics
  // ---------------------------------------------------------------------
  async _getRevenueAnalytics(query = {}) {
    const storeFilter = await buildStoreFilter(query);
    const dateRange = buildDateRange(query);
    const baseMatch = { status: "paid" };
    if (storeFilter) baseMatch.storeId = { $in: await this._matchingStoreIds(query) };

    const monthlyMatch = { ...baseMatch, createdAt: { $gte: startOfLast365Days } };
    if (dateRange) monthlyMatch.createdAt = dateRange;
    const monthly = await Invoice.aggregate([
      { $match: monthlyMatch },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
          tax: { $sum: "$tax" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const dailyMatch = { ...baseMatch, createdAt: { $gte: startOfLast30Days } };
    if (dateRange) dailyMatch.createdAt = dateRange;
    const daily = await Invoice.aggregate([
      { $match: dailyMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const byPlanMatch = { status: "paid" };
    if (storeFilter) byPlanMatch.storeId = baseMatch.storeId;
    const byPlan = await Invoice.aggregate([
      { $match: byPlanMatch },
      { $group: { _id: "$planId", total: { $sum: "$total" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);
    const planIds = byPlan.map((b) => b._id);
    const plans = await Plan.find({ _id: { $in: planIds } }).select("name").lean();
    const planMap = Object.fromEntries(plans.map((p) => [String(p._id), p.name]));

    // Previous year comparison
    const prevYearStart = new Date(startOfLast365Days);
    prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
    const prevYearRevenue = await Invoice.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: prevYearStart, $lt: startOfLast365Days } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const currentYearRevenue = monthly.reduce((s, r) => s + r.total, 0);

    // Simple linear forecast for the next 3 months based on trailing 3-month avg
    const last3 = monthly.slice(-3);
    const avg3 = last3.length > 0 ? last3.reduce((s, r) => s + r.total, 0) / last3.length : 0;
    const forecast = [1, 2, 3].map((i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      return { period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, total: Math.round(avg3 * 100) / 100, forecast: true };
    });

    return {
      monthly: monthly.map((r) => ({ period: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`, total: r.total, count: r.count, tax: r.tax || 0 })),
      daily: daily.map((r) => ({ date: r._id, total: r.total })),
      byPlan: byPlan.map((b) => ({ planId: b._id, planName: planMap[String(b._id)] || "Unknown", total: b.total, count: b.count })),
      comparison: {
        currentYear: fmtMoney(currentYearRevenue),
        previousYear: fmtMoney(prevYearRevenue[0]?.total || 0),
        growth: pct(currentYearRevenue, prevYearRevenue[0]?.total || 1),
      },
      forecast,
    };
  }

  /** Resolves the store._ids matching the active store-level filters. */
  async _matchingStoreIds(query = {}) {
    const filter = await buildStoreFilter(query);
    if (!filter) return [];
    const stores = await Store.find(filter).select("_id").lean();
    return stores.map((s) => s._id);
  }

  // ---------------------------------------------------------------------
  // Store Analytics
  // ---------------------------------------------------------------------
  async _getStoreAnalytics(query = {}) {
    const storeFilter = await buildStoreFilter(query);
    const baseCond = { deletedAt: null };
    if (storeFilter) Object.assign(baseCond, storeFilter);

    const byStatus = await Store.aggregate([
      { $match: baseCond },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const byPlan = await Store.aggregate([
      { $match: { ...baseCond, planId: { $ne: null } } },
      { $group: { _id: "$planId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    const planIds = byPlan.map((b) => b._id);
    const plans = await Plan.find({ _id: { $in: planIds } }).select("name").lean();
    const planMap = Object.fromEntries(plans.map((p) => [String(p._id), p.name]));

    const byCountry = await Store.aggregate([
      { $match: { ...baseCond, country: { $nin: [null, ""] } } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const dateRange = buildDateRange(query);
    const monthlyMatch = { ...baseCond };
    if (dateRange) monthlyMatch.createdAt = dateRange;
    else monthlyMatch.createdAt = { $gte: startOfLast90Days };
    const monthly = await Store.aggregate([
      { $match: monthlyMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
      byPlan: byPlan.map((b) => ({ planId: b._id, planName: planMap[String(b._id)] || "Unknown", count: b.count })),
      byCountry,
      monthly,
    };
  }

// ---------------------------------------------------------------------
  // Subscription Analytics
  // ---------------------------------------------------------------------
  async _getSubscriptionAnalytics(query = {}) {
    const storeFilter = await buildStoreFilter(query);
    const subMatch = {};
    if (storeFilter) subMatch.storeId = { $in: await this._matchingStoreIds(query) };

    const byStatus = await Subscription.aggregate([
      { $match: subMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const byPlan = await Subscription.aggregate([
      { $match: subMatch },
      { $group: { _id: "$planId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const planIds = byPlan.map((b) => b._id);
    const plans = await Plan.find({ _id: { $in: planIds } }).select("name pricing").lean();
    const planMap = Object.fromEntries(plans.map((p) => [String(p._id), p]));

    const monthly = await Subscription.aggregate([
      { $match: { createdAt: { $gte: startOfLast30Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Renewals / upgrades / downgrades / cancellations in last 90 days
    const events = await SubscriptionEvent.aggregate([
      { $match: { createdAt: { $gte: startOfLast90Days } } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    const expiringSoon = await Subscription.countDocuments({
      status: "active",
      currentPeriodEnd: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), $gte: now },
    });

    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
      byPlan: byPlan.map((b) => {
        const plan = planMap[String(b._id)] || {};
        return {
          planId: b._id,
          planName: plan.name || "Unknown",
          count: b.count,
          mrr: plan.pricing?.monthly ? b.count * plan.pricing.monthly : 0,
          arr: plan.pricing?.yearly ? b.count * plan.pricing.yearly : 0,
        };
      }),
      monthly,
      events: Object.fromEntries(events.map((e) => [e._id, e.count])),
      expiringSoon,
    };
  }

// ---------------------------------------------------------------------
  // Payment Analytics
  // ---------------------------------------------------------------------
  async _getPaymentAnalytics(query = {}) {
    const storeFilter = await buildStoreFilter(query);
    const payMatch = {};
    if (storeFilter) payMatch.storeId = { $in: await this._matchingStoreIds(query) };

    const byStatus = await Payment.aggregate([
      { $match: payMatch },
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    const byGateway = await Payment.aggregate([
      { $match: payMatch },
      { $group: { _id: "$gateway", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    const byCurrency = await Payment.aggregate([
      { $match: payMatch },
      { $group: { _id: "$currency", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    const byCountry = await Payment.aggregate([
      {
        $lookup: {
          from: "stores",
          localField: "storeId",
          foreignField: "_id",
          as: "store",
        },
      },
      { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
      { $match: { "store.country": { $nin: [null, ""] } } },
      { $group: { _id: "$store.country", count: { $sum: 1 }, total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    const avgAmount = await Payment.aggregate([
      { $match: { status: { $in: ["paid", "succeeded"] } } },
      { $group: { _id: null, avg: { $avg: "$amount" } } },
    ]);

    // Refunds + chargebacks
    const refunds = await PaymentRefund.aggregate([
      { $match: { status: { $in: ["approved", "completed", "processing"] } } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);
    const chargebacks = await Payment.countDocuments({ status: "refunded" });

    const successful = byStatus.find((s) => ["paid", "succeeded"].includes(s._id));
    const failed = byStatus.find((s) => s._id === "failed");
    const total = byStatus.reduce((s, r) => s + r.count, 0);
    const successRate = total > 0 ? Math.round(((successful?.count || 0) / total) * 100) : 100;

    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, { count: s.count, total: s.total }])),
      byGateway: Object.fromEntries(byGateway.map((g) => [g._id || "unknown", { count: g.count, total: g.total }])),
      byCurrency: Object.fromEntries(byCurrency.map((c) => [c._id || "USD", { count: c.count, total: c.total }])),
      byCountry,
      avgAmount: avgAmount[0]?.avg || 0,
      refunds: { count: refunds[0]?.count || 0, total: refunds[0]?.total || 0 },
      chargebacks,
      successRate,
    };
  }

  // ---------------------------------------------------------------------
  // Financial Analytics
  // ---------------------------------------------------------------------
  async _getFinancialAnalytics() {
    const [invoiceCounts, unpaidInvoices, taxCollected, discountData, couponUsage] = await Promise.all([
      Invoice.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$total" } } },
      ]),
      Invoice.aggregate([
        { $match: { status: { $in: ["overdue", "sent"] } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$total" } } },
      ]),
      Invoice.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$tax" } } },
      ]),
      Invoice.aggregate([
        { $match: { "discounts.0": { $exists: true } } },
        { $unwind: "$discounts" },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$discounts.discountAmount" } } },
      ]),
      PlatformCoupon.aggregate([
        { $group: { _id: null, usedCount: { $sum: "$usedCount" }, totalCoupons: { $sum: 1 } } },
      ]),
    ]);

    const invoiceMap = Object.fromEntries(invoiceCounts.map((i) => [i._id, { count: i.count, total: i.total }]));
    const gross = invoiceMap.paid?.total || 0;
    const tax = taxCollected[0]?.total || 0;
    const discounts = discountData[0]?.total || 0;
    const net = gross - tax - discounts;

    // Infrastructure cost estimate  a configurable constant, can be replaced
    // by real billing data from a `PlatformCost` collection later.
    const infraCost = Math.round(gross * 0.08 * 100) / 100;
    const profit = net - infraCost;
    const margin = net > 0 ? Math.round((profit / net) * 100) : 0;

    // Simple forecast: trailing 3 months avg * 1.1 (seasonality heuristic)
    const monthly = await Invoice.aggregate([
      { $match: { status: "paid", createdAt: { $gte: startOfLast90Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          total: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const trailing3 = monthly.slice(-3);
    const avg3 = trailing3.length > 0 ? trailing3.reduce((s, r) => s + r.total, 0) / trailing3.length : 0;

    return {
      totalInvoices: invoiceCounts.reduce((s, r) => s + r.count, 0),
      byStatus: invoiceMap,
      unpaid: { count: unpaidInvoices[0]?.count || 0, total: unpaidInvoices[0]?.total || 0 },
      taxCollected: tax,
      couponsUsed: couponUsage[0]?.usedCount || 0,
      totalCoupons: couponUsage[0]?.totalCoupons || 0,
      discounts: discounts,
      grossRevenue: gross,
      netRevenue: fmtMoney(net),
      infraCost: fmtMoney(infraCost),
      profit: fmtMoney(profit),
      margin,
      forecast: fmtMoney(Math.round(avg3 * 1.1 * 100) / 100),
    };
  }

  // ---------------------------------------------------------------------
  // Advanced SaaS Metrics
  // ---------------------------------------------------------------------
  async _getAdvancedMetrics() {
    const [
      totalStores,
      trialSubscriptions,
      activeSubscriptions,
      totalUsers,
      totalCustomers,
      totalProducts,
      totalOrders,
      totalRevenue,
      monthRevenue,
      previousMonthRevenue,
      canceledSubs,
      expiredSubs,
      activeStoreOwners,
      expansionRevenue,
      downgradeRevenue,
    ] = await Promise.all([
      Store.countDocuments({ deletedAt: null }),
      Subscription.countDocuments({ status: "trial" }),
      Subscription.countDocuments({ status: "active" }),
      User.countDocuments({ deletedAt: null }),
      Customer.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Invoice.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
      Invoice.aggregate([{ $match: { status: "paid", createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
      Invoice.aggregate([{ $match: { status: "paid", createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
      Subscription.countDocuments({ status: "canceled" }),
      Subscription.countDocuments({ status: "expired" }),
      User.countDocuments({ userType: "store_admin", status: "Active", deletedAt: null }),
      // Upgrade revenue: subscriptions with events "upgraded" last 90d
      SubscriptionEvent.aggregate([
        { $match: { type: "upgraded", createdAt: { $gte: startOfLast90Days } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      // Downgrade events
      SubscriptionEvent.aggregate([
        { $match: { type: "downgraded", createdAt: { $gte: startOfLast90Days } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
    ]);

    const totalRev = totalRevenue[0]?.total || 0;
    const mrrValue = monthRevenue[0]?.total || 0;
    const prevMonth = previousMonthRevenue[0]?.total || 0;
    const arr = mrrValue * 12;

    // Activation Rate: stores with at least one order vs total active stores
    const storesWithOrders = await Order.aggregate([{ $group: { _id: "$storeId" } }, { $count: "count" }]);
    const activeStoresCount = activeSubscriptions > 0 ? activeSubscriptions : totalStores;
    const activationRate = activeStoresCount > 0 ? Math.round((storesWithOrders[0]?.count || 0) / activeStoresCount * 100) : 0;

    // Trial conversion
    const convertedTrials = await Subscription.countDocuments({ status: "active", trialEndDate: { $ne: null } });
    const trialConversion = (convertedTrials + trialSubscriptions) > 0
      ? Math.round((convertedTrials / (convertedTrials + trialSubscriptions)) * 100)
      : 0;

    // CAC = total marketing cost / new customers. Using heuristic 10% of revenue.
    const cac = activeStoreOwners > 0 ? Math.round((totalRev * 0.1) / activeStoreOwners * 100) / 100 : 0;

    // LTV = ARPU / churn
    const arpu = activeSubscriptions > 0 ? totalRev / activeSubscriptions : 0;
    const churnCount = canceledSubs + expiredSubs;
    const totalSubsEver = await Subscription.countDocuments();
    const churnRate = totalSubsEver > 0 ? (churnCount / totalSubsEver) * 100 : 0;
    const ltv = churnRate > 0 ? arpu / (churnRate / 100) : arpu * 12;

    // NRR / GRR
    const upgraded = expansionRevenue[0]?.count || 0;
    const downgraded = downgradeRevenue[0]?.count || 0;
    const expansionRevenueValue = upgraded * (arpu * 0.3); // heuristic 30% uplift per upgrade
    const contractionRevenueValue = downgraded * (arpu * 0.2); // heuristic 20% reduction per downgrade
    const netRetention = totalRev > 0 ? ((totalRev - (churnCount * arpu) + expansionRevenueValue) / totalRev) * 100 : 100;
    const grossRetention = totalRev > 0 ? ((totalRev - (churnCount * arpu)) / totalRev) * 100 : 100;

    const mrrGrowth = prevMonth > 0 ? ((mrrValue - prevMonth) / prevMonth) * 100 : 0;

    return {
      activationRate,
      trialConversion,
      mrr: fmtMoney(mrrValue),
      arr: fmtMoney(arr),
      arpu: fmtMoney(arpu),
      cac: fmtMoney(cac),
      ltv: fmtMoney(ltv),
      nrr: Math.round(netRetention * 100) / 100,
      grr: Math.round(grossRetention * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      expansionRevenue: fmtMoney(expansionRevenueValue),
      mrrGrowth: Math.round(mrrGrowth * 100) / 100,
      avgStoreRevenue: totalStores > 0 ? fmtMoney(totalRev / totalStores) : 0,
      avgOrders: totalStores > 0 ? Math.round(totalOrders / totalStores) : 0,
      avgCustomers: totalStores > 0 ? Math.round(totalCustomers / totalStores) : 0,
      avgProducts: totalStores > 0 ? Math.round(totalProducts / totalStores) : 0,
    };
  }

  // ---------------------------------------------------------------------
  // Top Stores
  // ---------------------------------------------------------------------
  async _getTopStores() {
    const top = await Invoice.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: "$storeId", revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    const storeIds = top.map((t) => t._id).filter(Boolean);
    const stores = storeIds.length > 0
      ? await Store.find({ _id: { $in: storeIds } })
          .populate("ownerId", "name email")
          .populate("planId", "name")
          .lean()
      : [];
    const storeMap = Object.fromEntries(stores.map((s) => [String(s._id), s]));

    return top.map((t) => {
      const store = storeMap[String(t._id)] || {};
      return {
        storeId: t._id,
        name: store.name || "Unknown",
        owner: store.ownerId?.name || "N/A",
        plan: store.planId?.name || store.planName || "Free",
        revenue: t.revenue,
        orders: t.orders,
        status: store.status || "unknown",
      };
    });
  }

  // ---------------------------------------------------------------------
  // Recent Activity
  // ---------------------------------------------------------------------
  async _getRecentActivity() {
    return await AuditLog.find({})
      .populate("actorId", "name email image")
      .populate("storeId", "name")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
  }

  // ---------------------------------------------------------------------
  // Alerts Center
  // ---------------------------------------------------------------------
  async _getAlerts() {
    const alerts = [];

    const failedPayments = await Payment.countDocuments({ status: "failed", createdAt: { $gte: startOfLast24Hours() } });
    if (failedPayments > 0) {
      alerts.push({ severity: "critical", type: "payment_failed", message: `${failedPayments} paiements échoués (24h)`, count: failedPayments, source: "payments", action: "Voir les paiements" });
    }

    const overdueInvoices = await Invoice.countDocuments({ status: "overdue" });
    if (overdueInvoices > 0) {
      alerts.push({ severity: "warning", type: "overdue_invoices", message: `${overdueInvoices} factures impayés`, count: overdueInvoices, source: "invoices", action: "Voir les factures" });
    }

    const quotaExceeded = await UsageCounter.countDocuments({ softLimitLevel: { $in: ["warning", "critical", "blocked"] } });
    if (quotaExceeded > 0) {
      alerts.push({ severity: "warning", type: "quota_exceeded", message: `${quotaExceeded} quotas dépassés`, count: quotaExceeded, source: "usage", action: "Voir les quotas" });
    }

    const expiredSubs = await Subscription.countDocuments({ status: "expired" });
    if (expiredSubs > 0) {
      alerts.push({ severity: "warning", type: "expired_subscriptions", message: `${expiredSubs} abonnements expirés`, count: expiredSubs, source: "subscriptions", action: "Voir les abonnements" });
    }

    const expiringSoon = await Subscription.countDocuments({
      status: "active",
      currentPeriodEnd: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), $gte: now },
    });
    if (expiringSoon > 0) {
      alerts.push({ severity: "info", type: "subscriptions_expiring", message: `${expiringSoon} abonnements expirent sous 7 jours`, count: expiringSoon, source: "subscriptions", action: "Voir les abonnements" });
    }

    const suspendedStores = await Store.countDocuments({ status: "suspended", deletedAt: null });
    if (suspendedStores > 0) {
      alerts.push({ severity: "critical", type: "suspended_stores", message: `${suspendedStores} boutiques suspendues`, count: suspendedStores, source: "stores", action: "Voir les boutiques" });
    }

    const pastDueSubs = await Subscription.countDocuments({ status: "past_due" });
    if (pastDueSubs > 0) {
      alerts.push({ severity: "warning", type: "past_due_subscriptions", message: `${pastDueSubs} abonnements en retard`, count: pastDueSubs, source: "subscriptions", action: "Voir les abonnements" });
    }

const blockedUsers = await User.countDocuments({ status: "Blocked" });
    if (blockedUsers > 0) {
      alerts.push({ severity: "info", type: "blocked_users", message: `${blockedUsers} utilisateurs bloqués`, count: blockedUsers, source: "users", action: "Voir les utilisateurs" });
    }

    // --- Infrastructure signals (F10.1) ---------------------------------
    // MongoDB connection state
    const mongoStates = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    const mongoState = mongoStates[mongoose.connection.readyState];
    if (mongoState !== "connected") {
      alerts.push({
        severity: "critical",
        type: "mongo_unavailable",
        message: `MongoDB ${mongoState === "disconnected" ? "indisponible" : "en cours de " + mongoState}`,
        count: 1,
        source: "infrastructure",
        action: "Voir infrastructure",
      });
    }

    // Webhook delivery errors in the last 24h
    const webhookErrors = await AuditLog.countDocuments({
      module: "webhook",
      status: "failed",
      createdAt: { $gte: startOfLast24Hours() },
    }).catch(() => 0);
    if (webhookErrors > 0) {
      alerts.push({
        severity: "warning",
        type: "webhook_errors",
        message: `${webhookErrors} webhooks en erreur (24h)`,
        count: webhookErrors,
        source: "webhooks",
        action: "Voir les webhooks",
      });
    }

    // Host CPU / memory load (available even without an agent)
    const loadAvg = os.loadavg ? os.loadavg()[0] : 0;
    const cpuCount = os.cpus ? os.cpus().length : 1;
    const cpuPct = cpuCount > 0 ? Math.round((loadAvg / cpuCount) * 100) : 0;
    if (cpuPct > 85) {
      alerts.push({
        severity: "critical",
        type: "high_cpu",
        message: `CPU élevé (${cpuPct}%)`,
        count: cpuPct,
        source: "infrastructure",
        action: "Voir infrastructure",
      });
    } else if (cpuPct > 70) {
      alerts.push({
        severity: "warning",
        type: "high_cpu",
        message: `CPU élevé (${cpuPct}%)`,
        count: cpuPct,
        source: "infrastructure",
        action: "Voir infrastructure",
      });
    }

    const totalMem = os.totalmem ? os.totalmem() : 0;
    const freeMem = os.freemem ? os.freemem() : 0;
    const memUsedPct = totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 100) : 0;
    if (memUsedPct > 90) {
      alerts.push({
        severity: "critical",
        type: "high_memory",
        message: `Mémoire utilisé (${memUsedPct}%)`,
        count: memUsedPct,
        source: "infrastructure",
        action: "Voir infrastructure",
      });
    } else if (memUsedPct > 80) {
      alerts.push({
        severity: "warning",
        type: "high_memory",
        message: `Mémoire utilisé (${memUsedPct}%)`,
        count: memUsedPct,
        source: "infrastructure",
        action: "Voir infrastructure",
      });
    }

    return alerts;
  }

  // ---------------------------------------------------------------------
  // Geographic Analytics
  // ---------------------------------------------------------------------
  async _getGeographicAnalytics() {
    const byCountry = await Store.aggregate([
      { $match: { deletedAt: null, country: { $nin: [null, ""] } } },
      { $group: { _id: "$country", stores: { $sum: 1 } } },
      { $sort: { stores: -1 } },
      { $limit: 20 },
    ]);

    const revenueByCountry = await Invoice.aggregate([
      { $match: { status: "paid" } },
      { $lookup: { from: "stores", localField: "storeId", foreignField: "_id", as: "store" } },
      { $unwind: "$store" },
      { $match: { "store.country": { $nin: [null, ""] } } },
      { $group: { _id: "$store.country", revenue: { $sum: "$total" }, transactions: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
    ]);

    return { byCountry, revenueByCountry };
  }

  // ---------------------------------------------------------------------
  // Providers Analytics (normalized: Stripe, Flouci, Konnect, Click To Pay, PayPal, Razorpay)
  // ---------------------------------------------------------------------
  async _getProvidersAnalytics() {
    const byMethod = await Payment.aggregate([
      {
        $group: {
          _id: "$gateway",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          avgLatency: { $avg: "$metadata.latency" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Also pull PaymentProvider collection for availability/status
    const providers = await PaymentProvider.find({}).select("name code status").lean().catch(() => []);

    const normalize = (name) => {
      const key = String(name || "").toLowerCase().replace(/[^a-z]/g, "");
      return PROVIDER_ALIASES[key] || name || "Unknown";
    };

    const result = {};
    for (const p of byMethod) {
      const label = normalize(p._id);
      result[label] = {
        name: label,
        transactions: p.count,
        amount: p.total,
        errors: p.failed,
        availability: p.count > 0 ? 100 - Math.round((p.failed / p.count) * 100) : 100,
        avgLatency: p.avgLatency || 0,
        status: providers.find((pr) => (pr.code || "").toLowerCase() === label.toLowerCase())?.status || "active",
      };
    }

    // Ensure known providers appear even with zero data
    const known = ["Stripe", "Flouci", "Konnect", "Click To Pay", "PayPal", "Razorpay"];
    for (const k of known) {
      if (!result[k]) {
        result[k] = { name: k, transactions: 0, amount: 0, errors: 0, availability: 100, avgLatency: 0, status: "active" };
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------
  // Usage Analytics
  // ---------------------------------------------------------------------
  async _getUsageAnalytics() {
    const [
      totalProducts,
      totalVariants,
      totalCategories,
      totalImages,
      totalOrders,
      totalCustomers,
      totalCoupons,
      totalReviews,
      totalPosts,
      totalPages,
      apiCallsAgg,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.aggregate([{ $unwind: "$variations" }, { $count: "count" }]).then((r) => r[0]?.count || 0),
      Category.countDocuments(),
      Product.aggregate([{ $unwind: "$images" }, { $count: "count" }]).then((r) => r[0]?.count || 0),
      Order.countDocuments(),
      Customer.countDocuments(),
      PlatformCoupon.countDocuments(),
      ProductReview.countDocuments(),
      Post.countDocuments(),
      Post.countDocuments(),
      UsageCounter.aggregate([
        { $match: { quotaTypeCode: "api_calls" } },
        { $group: { _id: null, total: { $sum: "$used" } } },
      ]),
    ]);

    const webhooks = await AuditLog.countDocuments({ module: "webhook" }).catch(() => 0);
    const storageUsed = await StoreUsage.aggregate([
      { $match: { quotaTypeCode: { $exists: true } } },
    ]).catch(() => []);
    const totalStorage = 0;

    return {
      products: totalProducts,
      variants: totalVariants,
      categories: totalCategories,
      images: totalImages,
      orders: totalOrders,
      customers: totalCustomers,
      coupons: totalCoupons,
      reviews: totalReviews,
      blogs: totalPosts,
      pages: totalPages,
      apiCalls: apiCallsAgg[0]?.total || 0,
      webhooks,
      storageUsed: totalStorage,
    };
  }

  // ---------------------------------------------------------------------
  // Platform Health
  // ---------------------------------------------------------------------
async _getPlatformHealth() {
    // Real checks only  no simulated services. Components that are not part
    // of the deployed stack (Redis, Elasticsearch, RabbitMQ, CDN&) are simply
    // not reported rather than faked as "healthy".
    const now = new Date();
    const lastCheck = now.toISOString();
    const since24h = new Date(now.getTime() - 86400000);
    const services = [];

    // API  serving this request proves liveness.
    services.push({ name: "API", status: "healthy", latency: "-", lastCheck, error: null });

    // MongoDB  live driver state.
    const mongoStates = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
    const mongoState = mongoStates[mongoose.connection.readyState] || "disconnected";
    services.push({
      name: "MongoDB",
      status: mongoState === "connected" ? "healthy" : "critical",
      latency: "-",
      lastCheck,
      error: mongoState === "connected" ? null : `Connection ${mongoState}`,
    });

    try {
      const [emailPending, emailFailed24h] = await Promise.all([
        EmailQueueJob.countDocuments({ status: "pending" }),
        EmailQueueJob.countDocuments({ status: "failed", updatedAt: { $gte: since24h } }),
      ]);
      services.push({
        name: "Email Queue",
        status: emailFailed24h > 0 ? "warning" : emailPending > 500 ? "warning" : "healthy",
        latency: "-",
        lastCheck,
        error: emailFailed24h > 0 ? `${emailFailed24h} failed in the last 24h` : null,
      });
    } catch (e) {
      services.push({ name: "Email Queue", status: "unavailable", latency: "-", lastCheck, error: e.message });
    }

    try {
      const webhookFailures24h = await WebhookLog.countDocuments({
        createdAt: { $gte: since24h },
        $or: [{ status: "failed" }, { status: "retrying" }],
      });
      services.push({
        name: "Webhooks",
        status: webhookFailures24h > 5 ? "warning" : "healthy",
        latency: "-",
        lastCheck,
        error: webhookFailures24h > 0 ? `${webhookFailures24h} failed/retrying in 24h` : null,
      });
    } catch (e) {
      services.push({ name: "Webhooks", status: "unavailable", latency: "-", lastCheck, error: e.message });
    }

    try {
      const [exportFailed, backupFailed] = await Promise.all([
        ExportJob.countDocuments({ status: "failed", updatedAt: { $gte: since24h } }).catch(() => 0),
        BackupJob.countDocuments({ status: "failed", updatedAt: { $gte: since24h } }).catch(() => 0),
      ]);
      const totalFailed = exportFailed + backupFailed;
      services.push({
        name: "Jobs & Exports",
        status: totalFailed > 0 ? "warning" : "healthy",
        latency: "-",
        lastCheck,
        error: totalFailed > 0 ? `${totalFailed} failed job(s) in 24h` : null,
      });
    } catch (e) {
      services.push({ name: "Jobs & Exports", status: "unavailable", latency: "-", lastCheck, error: e.message });
    }

    const criticalAlerts = await this._getAlerts();
    const hasCritical = criticalAlerts.some((a) => a.severity === "critical");
    const hasFailingService = services.some((s) => s.status === "critical");

    return {
      status: hasCritical || hasFailingService ? "degraded" : criticalAlerts.some((a) => a.severity === "warning") ? "attention" : "healthy",
      services,
      criticalAlerts: criticalAlerts.filter((a) => a.severity === "critical").length,
      warningAlerts: criticalAlerts.filter((a) => a.severity === "warning").length,
    };
  }

  // ---------------------------------------------------------------------
  // Infrastructure
  // ---------------------------------------------------------------------
  async _getInfrastructure() {
    const storeUsage = await Store.aggregate([
      {
        $group: {
          _id: null,
          totalCPU: { $sum: "$quotaUsage.cpu" },
          totalRAM: { $sum: "$quotaUsage.ram" },
          totalDisk: { $sum: "$quotaUsage.disk" },
          totalStorage: { $sum: "$quotaUsage.storage" },
        },
      },
    ]);

    const usage = storeUsage[0] || {};

    // Usage counters for infra-like quotas
    const counters = await UsageCounter.aggregate([
      { $match: { periodEnd: { $gte: startOfMonth } } },
      {
        $group: {
          _id: "$quotaTypeCode",
          used: { $sum: "$used" },
          included: { $sum: "$included" },
        },
      },
    ]);
    const counterMap = Object.fromEntries(counters.map((c) => [c._id, c]));

    const emailsSent = counterMap.emails?.used || 0;
    const smsSent = counterMap.sms?.used || 0;
    const notificationsSent = counterMap.notifications?.used || 0;
    const workers = counterMap.workers?.used || 0;
    const backgroundJobs = counterMap.background_jobs?.used || 0;
    const queueSize = counterMap.queues?.used || 0;

    return {
      cpu: usage.totalCPU || 0,
      ram: usage.totalRAM || 0,
      disk: usage.totalDisk || 0,
      storage: usage.totalStorage || 0,
      workers,
      backgroundJobs,
      queueSize,
      emailsSent,
      smsSent,
      notificationsSent,
    };
  }

  // ---------------------------------------------------------------------
  // Risk Analysis
  // ---------------------------------------------------------------------
  async _getRiskAnalysis() {
    const noOrderStores = await Store.aggregate([
      {
        $lookup: { from: "orders", localField: "_id", foreignField: "storeId", as: "orders" },
      },
      { $match: { "orders.0": { $exists: false }, status: "active", deletedAt: null } },
      { $count: "count" },
    ]);

    const inactiveStores = await Store.countDocuments({ status: "inactive", deletedAt: null });
    const quotaExceeded = await UsageCounter.countDocuments({ softLimitLevel: { $in: ["warning", "critical", "blocked"] } });
    const apiErrors = await AuditLog.countDocuments({ module: "api", status: "failed", createdAt: { $gte: startOfLast24Hours() } });
    const subscriptionsExpiring = await Subscription.countDocuments({
      currentPeriodEnd: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      status: "active",
    });

    return {
      noOrderStores: noOrderStores[0]?.count || 0,
      inactiveStores,
      quotaExceeded,
      apiErrors,
      subscriptionsExpiring,
    };
  }
}

function startOfLast24Hours() {
  const d = new Date();
  d.setHours(d.getHours() - 24);
  return d;
}

module.exports = new PlatformDashboardV2Service();

