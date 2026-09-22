const mongoose = require("mongoose");
const User = require("../models/User");
const Store = require("../models/Store");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

class AnalyticsService {
  async getDashboardMetrics() {
    const [
      totalStores,
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      totalUsers,
      totalRevenue,
      recentAuditLogs,
    ] = await Promise.all([
      Store.countDocuments({ deletedAt: null }),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "trial" }),
      User.countDocuments({ deletedAt: null }),
      Invoice.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      require("../service/AuditService").getRecentActivity(10),
    ]);

    const revenueResult = totalRevenue[0] || { total: 0 };
    const totalRevenueValue = Math.round(revenueResult.total * 100) / 100;
    const mrr = activeSubscriptions > 0 ? totalRevenueValue / Math.max(activeSubscriptions, 1) : 0;

    const plansWithSubs = await Subscription.aggregate([
      { $match: { status: { $in: ["active", "trial"] } } },
      { $group: { _id: "$planId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const planIds = plansWithSubs.map((p) => p._id);
    const plans = await Plan.find({ _id: { $in: planIds } }).select("name").lean();
    const planMap = Object.fromEntries(plans.map((p) => [p._id.toString(), p.name]));

    const subscriptionsByPlan = plansWithSubs.map((p) => ({
      planId: p._id,
      planName: planMap[p._id?.toString()] || "Unknown",
      count: p.count,
    }));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers30d = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      deletedAt: null,
    });

    const previous30Days = new Date();
    previous30Days.setDate(previous30Days.getDate() - 60);
    const newUsersPrev30d = await User.countDocuments({
      createdAt: { $gte: previous30Days, $lt: thirtyDaysAgo },
      deletedAt: null,
    });

    const userGrowthDelta = newUsersPrev30d > 0
      ? Math.round(((newUsers30d - newUsersPrev30d) / newUsersPrev30d) * 100)
      : newUsers30d > 0 ? 100 : 0;

    return {
      stores: {
        total: totalStores,
        delta: 0,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        trial: trialSubscriptions,
        delta: 0,
      },
      mrr: {
        value: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        delta: 0,
      },
      revenue: {
        total: totalRevenueValue,
        delta: 0,
      },
      users: {
        total: totalUsers,
        new30d: newUsers30d,
        delta: userGrowthDelta,
      },
      subscriptionsByPlan,
      recentActivity: recentAuditLogs,
    };
  }

  async getRevenueAnalytics(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    startDate.setDate(1);

    const monthlyRevenue = await Invoice.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyRevenue = await Invoice.aggregate([
      {
        $match: { status: "paid", createdAt: { $gte: thirtyDaysAgo } },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      monthly: monthlyRevenue.map((r) => ({
        period: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
        total: r.total,
        invoiceCount: r.count,
      })),
      daily: dailyRevenue.map((r) => ({ date: r._id, total: r.total })),
    };
  }

  async getSubscriptionAnalytics() {
    const distribution = await Subscription.aggregate([
      { $match: { status: { $in: ["active", "trial"] } } },
      { $group: { _id: "$planId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const planIds = distribution.map((d) => d._id);
    const plans = await Plan.find({ _id: { $in: planIds } }).select("name pricing").lean();
    const planMap = Object.fromEntries(plans.map((p) => [p._id.toString(), p]));

    return {
      byPlan: distribution.map((d) => ({
        planId: d._id,
        planName: planMap[d._id?.toString()]?.name || "Unknown",
        subscribers: d.count,
      })),
    };
  }

  async getUserAnalytics(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    startDate.setDate(1);

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate }, deletedAt: null } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const byType = await User.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$userType",
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      growth: userGrowth.map((r) => ({
        period: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
        count: r.count,
      })),
      byType: Object.fromEntries(byType.map((t) => [t._id, t.count])),
    };
  }

  async getChurnAnalytics(months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const canceled = await Subscription.aggregate([
      {
        $match: {
          status: { $in: ["canceled", "expired"] },
          updatedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$updatedAt" }, month: { $month: "$updatedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const totalActive = await Subscription.countDocuments({ status: { $in: ["active", "trial"] } });
    const totalCanceled = await Subscription.countDocuments({ status: { $in: ["canceled", "expired"] } });
    const churnRate = totalActive + totalCanceled > 0
      ? ((totalCanceled / (totalActive + totalCanceled)) * 100).toFixed(2)
      : 0;

    return {
      monthlyChurn: canceled.map((c) => ({
        period: `${c._id.year}-${String(c._id.month).padStart(2, "0")}`,
        canceled: c.count,
      })),
      churnRate: parseFloat(churnRate),
      totalCanceled,
      totalActive,
    };
  }

  async getTrialsAnalytics() {
    const now = new Date();
    const activeTrials = await Subscription.countDocuments({
      status: "trial",
      trialEndsAt: { $gte: now },
    });
    const expiredTrials = await Subscription.countDocuments({
      $or: [
        { status: "expired" },
        { status: "trial", trialEndsAt: { $lt: now } },
      ],
    });
    const convertedTrials = await Subscription.countDocuments({
      status: "active",
      trialEndsAt: { $ne: null },
    });

    return {
      activeTrials,
      expiredTrials,
      convertedTrials,
      conversionRate: expiredTrials + convertedTrials > 0
        ? ((convertedTrials / (expiredTrials + convertedTrials)) * 100).toFixed(2)
        : 0,
    };
  }

  async getPaymentsAnalytics() {
    const byStatus = await Payment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    const byGateway = await Payment.aggregate([
      { $group: { _id: "$gateway", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s._id, { count: s.count, total: s.total }])),
      byGateway: Object.fromEntries(byGateway.map((g) => [g._id || "unknown", { count: g.count, total: g.total }])),
    };
  }
}

module.exports = new AnalyticsService();
