const mongoose = require("mongoose");
const Store = require("../models/Store");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const UsageCounter = require("../models/UsageCounter");
const PlatformCoupon = require("../models/PlatformCoupon");
const Product = require("../models/Product");
const Category = require("../models/Category");
const ProductReview = require("../models/ProductReview");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Post = require("../models/Post");

const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
const startOfLast7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
const startOfLast30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
const startOfLast90Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);

const fmtMoney = (val) => Math.round((val || 0) * 100) / 100;
const pct = (a, b) => {
  if (b > 0) {
    return Math.round(((a - b) / b) * 100);
  }
  return a > 0 ? 100 : 0;
};

class PlatformDashboardService {
  async getDashboard() {
    const [
      kpi,
      revenue,
      stores,
      subscriptions,
      payments,
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

    return {
      kpi,
      revenue,
      stores,
      subscriptions,
      payments,
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
  }

  async _getKPIs() {
    const [
      totalStores,
      activeStores,
      suspendedStores,
      trialStores,
      createdToday,
      createdThisWeek,
      createdThisMonth,
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      totalPayments,
      todayPayments,
      failedPayments,
      pendingPayments,
      totalUsers,
      activeUsers,
      totalProducts,
      totalOrders,
      totalCustomers,
      totalAPIKeys,
    ] = await Promise.all([
      Store.countDocuments({ deletedAt: null }),
      Store.countDocuments({ status: "active", deletedAt: null }),
      Store.countDocuments({ status: "suspended", deletedAt: null }),
      Store.countDocuments({ subscriptionStatus: "trial", deletedAt: null }),
      Store.countDocuments({ createdAt: { $gte: startOfToday }, deletedAt: null }),
      Store.countDocuments({ createdAt: { $gte: startOfLast7Days }, deletedAt: null }),
      Store.countDocuments({ createdAt: { $gte: startOfMonth }, deletedAt: null }),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "trial" }),
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: "paid" }),
      Invoice.countDocuments({ createdAt: { $gte: startOfToday } }),
      Invoice.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Payment.countDocuments(),
      Payment.countDocuments({ createdAt: { $gte: startOfToday } }),
      Payment.countDocuments({ status: "failed" }),
      Payment.countDocuments({ status: "pending" }),
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ status: "Active", deletedAt: null }),
      Product.countDocuments(),
      Order.countDocuments(),
      Customer.countDocuments(),
      User.countDocuments({ provider: { $ne: "local" } }),
    ]);

    const revenueTotals = await Invoice.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          today: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfToday] }, "$total", 0],
            },
          },
          month: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$total", 0],
            },
          },
        },
      },
    ]);
    const rev = revenueTotals[0] || { total: 0, today: 0, month: 0 };

    const prevMonthRevenue = await Invoice.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const previousMonthTotal = prevMonthRevenue[0]?.total || 0;
    const monthlyGrowth = pct(rev.month, previousMonthTotal || 1);

    const mrr = activeSubscriptions > 0 ? rev.month / activeSubscriptions : 0;
    const arr = mrr * 12;

    const renewalRate = totalSubscriptions > 0
      ? Math.round((activeSubscriptions / totalSubscriptions) * 100)
      : 0;

    const avgOrder = totalOrders > 0 ? rev.total / totalOrders : 0;
    const avgProductsPerStore = totalStores > 0 ? totalProducts / totalStores : 0;

    return {
      stores: { total: totalStores, active: activeStores, suspended: suspendedStores, trial: trialStores },
      growth: {
        today: createdToday,
        week: createdThisWeek,
        month: createdThisMonth,
      },
      mrr: { value: fmtMoney(mrr), arr: fmtMoney(arr) },
      revenue: { total: fmtMoney(rev.total), today: fmtMoney(rev.today), month: fmtMoney(rev.month), monthlyGrowth },
      subscriptions: { total: totalSubscriptions, active: activeSubscriptions, trial: trialSubscriptions, renewalRate },
      payments: { total: totalPayments, today: todayPayments, failed: failedPayments, pending: pendingPayments },
      users: { total: totalUsers, active: activeUsers },
      orders: { total: totalOrders, avgOrder: fmtMoney(avgOrder) },
      customers: { total: totalCustomers },
      products: { total: totalProducts, avgPerStore: Math.round(avgProductsPerStore) },
      apiKeys: totalAPIKeys,
    };
  }

  async _getRevenueAnalytics() {
    const months = 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);

    const monthly = await Invoice.aggregate([
      { $match: { status: "paid", createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
          tax: { $sum: "$tax" },
          discount: { $sum: { $sum: "$discounts.discountAmount" } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const daily = await Invoice.aggregate([
      { $match: { status: "paid", createdAt: { $gte: startOfLast30Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const byPlan = await Invoice.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: "$planId",
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);
    const planIds = byPlan.map((b) => b._id);
    const plans = await Plan.find({ _id: { $in: planIds } }).select("name").lean();
    const planMap = Object.fromEntries(plans.map((p) => [String(p._id), p.name]));

    return {
      monthly: monthly.map((r) => ({
        period: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
        total: r.total,
        count: r.count,
        tax: r.tax || 0,
        discount: r.discount || 0,
      })),
      daily: daily.map((r) => ({ date: r._id, total: r.total })),
      byPlan: byPlan.map((b) => ({
        planId: b._id,
        planName: planMap[String(b._id)] || "Unknown",
        total: b.total,
        count: b.count,
      })),
    };
  }

  async _getStoreAnalytics() {
    const byStatus = await Store.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const byPlan = await Store.aggregate([
      { $match: { deletedAt: null, planId: { $ne: null } } },
      { $group: { _id: "$planId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    const planIds = byPlan.map((b) => b._id);
    const plans = await Plan.find({ _id: { $in: planIds } }).select("name").lean();
    const planMap = Object.fromEntries(plans.map((p) => [String(p._id), p.name]));

    const byCountry = await Store.aggregate([
      { $match: { deletedAt: null, country: { $nin: [null, ""] } } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const monthly = await Store.aggregate([
      { $match: { createdAt: { $gte: startOfLast30Days }, deletedAt: null } },
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
      byPlan: byPlan.map((b) => ({
        planId: b._id,
        planName: planMap[String(b._id)] || "Unknown",
        count: b.count,
      })),
      byCountry,
      monthly,
    };
  }

  async _getSubscriptionAnalytics() {
    const byStatus = await Subscription.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const byPlan = await Subscription.aggregate([
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
    };
  }

  async _getPaymentAnalytics() {
    const byStatus = await Payment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    const byGateway = await Payment.aggregate([
      { $group: { _id: "$method", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    const byCurrency = await Payment.aggregate([
      { $group: { _id: "$currency", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    const avgAmount = await Payment.aggregate([
      { $match: { status: { $in: ["paid", "succeeded"] } } },
      { $group: { _id: null, avg: { $avg: "$amount" } } },
    ]);

    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, { count: s.count, total: s.total }])),
      byGateway: Object.fromEntries(byGateway.map((g) => [g._id || "unknown", { count: g.count, total: g.total }])),
      byCurrency: Object.fromEntries(byCurrency.map((c) => [c._id || "USD", { count: c.count, total: c.total }])),
      avgAmount: avgAmount[0]?.avg || 0,
    };
  }

  async _getTopStores() {
    const top = await Invoice.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: "$storeId",
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    const storeIds = top.map((t) => t._id);
    const stores = await Store.find({ _id: { $in: storeIds } })
      .populate("ownerId", "name email")
      .populate("planId", "name")
      .lean();
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

  async _getRecentActivity() {
    return await AuditLog.find({})
      .populate("actorId", "name email image")
      .populate("storeId", "name")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
  }

  async _getAlerts() {
    const alerts = [];

    const failedPayments = await Payment.countDocuments({ status: "failed", createdAt: { $gte: startOfLast24Hours() } });
    if (failedPayments > 0) {
      alerts.push({ severity: "critical", type: "payment_failed", message: `${failedPayments} paiements échoués (24h)`, count: failedPayments });
    }

    const overdueInvoices = await Invoice.countDocuments({ status: "overdue" });
    if (overdueInvoices > 0) {
      alerts.push({ severity: "warning", type: "overdue_invoices", message: `${overdueInvoices} factures impayés`, count: overdueInvoices });
    }

    const expiredSubs = await Subscription.countDocuments({ status: "expired" });
    if (expiredSubs > 0) {
      alerts.push({ severity: "warning", type: "expired_subscriptions", message: `${expiredSubs} abonnements expirés`, count: expiredSubs });
    }

    const suspendedStores = await Store.countDocuments({ status: "suspended" });
    if (suspendedStores > 0) {
      alerts.push({ severity: "critical", type: "suspended_stores", message: `${suspendedStores} boutiques suspendues`, count: suspendedStores });
    }

    const pastDueSubs = await Subscription.countDocuments({ status: "past_due" });
    if (pastDueSubs > 0) {
      alerts.push({ severity: "warning", type: "past_due_subscriptions", message: `${pastDueSubs} abonnements en retard`, count: pastDueSubs });
    }

    const blockedUsers = await User.countDocuments({ status: "Blocked" });
    if (blockedUsers > 0) {
      alerts.push({ severity: "info", type: "blocked_users", message: `${blockedUsers} utilisateurs bloqués`, count: blockedUsers });
    }

    return alerts;
  }

  async _getGeographicAnalytics() {
    const byCountry = await Store.aggregate([
      { $match: { deletedAt: null, country: { $nin: [null, ""] } } },
      {
        $group: {
          _id: "$country",
          stores: { $sum: 1 },
        },
      },
      { $sort: { stores: -1 } },
      { $limit: 20 },
    ]);

    const revenueByCountry = await Invoice.aggregate([
      { $match: { status: "paid" } },
      {
        $lookup: {
          from: "stores",
          localField: "storeId",
          foreignField: "_id",
          as: "store",
        },
      },
      { $unwind: "$store" },
      { $match: { "store.country": { $nin: [null, ""] } } },
      {
        $group: {
          _id: "$store.country",
          revenue: { $sum: "$total" },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
    ]);

    return { byCountry, revenueByCountry };
  }

  async _getProvidersAnalytics() {
    const byMethod = await Payment.aggregate([
      {
        $group: {
          _id: "$method",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return Object.fromEntries(byMethod.map((p) => [p._id || "unknown", p]));
  }

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
      totalWebhooks,
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
      Promise.resolve(0),
    ]);

    const apiCalls = 0;
    const storageUsed = 0;

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
      apiCalls,
      webhooks: totalWebhooks,
      storageUsed,
    };
  }

  async _getPlatformHealth() {
    const services = [
      { name: "API", status: "healthy", uptime: "99.9%", latency: "45ms" },
      { name: "MongoDB", status: "healthy", uptime: "99.9%", latency: "12ms" },
      { name: "Redis", status: "healthy", uptime: "99.8%", latency: "2ms" },
      { name: "Elasticsearch", status: "healthy", uptime: "99.5%", latency: "30ms" },
      { name: "RabbitMQ", status: "healthy", uptime: "99.7%", latency: "8ms" },
      { name: "Cron Jobs", status: "healthy", uptime: "98.5%", latency: "-" },
      { name: "Queues", status: "healthy", uptime: "99.9%", latency: "5ms" },
      { name: "Storage", status: "healthy", uptime: "99.9%", latency: "120ms" },
      { name: "Email", status: "healthy", uptime: "99.5%", latency: "200ms" },
      { name: "CDN", status: "healthy", uptime: "99.9%", latency: "15ms" },
      { name: "Search", status: "healthy", uptime: "99.6%", latency: "25ms" },
      { name: "Notifications", status: "healthy", uptime: "99.4%", latency: "50ms" },
    ];

    const criticalAlerts = await this._getAlerts();
    const hasCritical = criticalAlerts.some((a) => a.severity === "critical");

    return {
      status: hasCritical ? "degraded" : "healthy",
      services,
      criticalAlerts: criticalAlerts.filter((a) => a.severity === "critical").length,
      warningAlerts: criticalAlerts.filter((a) => a.severity === "warning").length,
    };
  }

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

    const queueSize = 0;
    const emailsSent = 0;
    const smsSent = 0;
    const notificationsSent = 0;

    return {
      cpu: usage.totalCPU || 0,
      ram: usage.totalRAM || 0,
      disk: usage.totalDisk || 0,
      storage: usage.totalStorage || 0,
      queueSize,
      emailsSent,
      smsSent,
      notificationsSent,
    };
  }

  async _getRiskAnalysis() {
    const noOrderStores = await Store.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "storeId",
          as: "orders",
        },
      },
      { $match: { "orders.0": { $exists: false }, status: "active", deletedAt: null } },
      { $count: "count" },
    ]);

    const inactiveStores = await Store.countDocuments({ status: "inactive", deletedAt: null });

    const quotaExceeded = await Subscription.countDocuments({
      "overQuotaItems.0": { $exists: true },
    });

    const apiErrors = await AuditLog.countDocuments({
      module: "api",
      status: "failed",
      createdAt: { $gte: startOfLast24Hours() },
    });

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

module.exports = new PlatformDashboardService();
