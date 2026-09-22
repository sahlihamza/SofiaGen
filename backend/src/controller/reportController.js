const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Store = require("../models/Store");

/**
 * Compute MRR (Monthly Recurring Revenue) from active subscriptions
 * MRR = sum of monthly-normalized prices for active/trial subscriptions
 */
const getMrr = async (req, res) => {
  try {
    const activeSubs = await Subscription.find({
      status: { $in: ["active", "trial"] },
    }).lean();

    let mrr = 0;
    const currencyBreakdown = {};

    for (const sub of activeSubs) {
      const monthly = sub.billingCycle === "yearly"
        ? (sub.priceSnapshot?.yearly || 0) / 12
        : (sub.priceSnapshot?.monthly || 0);
      mrr += monthly;
      const cur = sub.priceSnapshot?.currency || "USD";
      currencyBreakdown[cur] = (currencyBreakdown[cur] || 0) + monthly;
    }

    res.status(200).json({
      success: true,
      data: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        activeSubscriptions: activeSubs.length,
        currencyBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ARR = MRR * 12
 */
const getArr = async (req, res) => {
  try {
    const activeSubs = await Subscription.find({
      status: { $in: ["active", "trial"] },
    }).lean();

    let mrr = 0;
    for (const sub of activeSubs) {
      mrr += sub.billingCycle === "yearly"
        ? (sub.priceSnapshot?.yearly || 0) / 12
        : (sub.priceSnapshot?.monthly || 0);
    }

    res.status(200).json({
      success: true,
      data: {
        arr: Math.round(mrr * 12 * 100) / 100,
        mrr: Math.round(mrr * 100) / 100,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Revenue per month for last N months (from paid invoices)
 */
const getRevenue = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    startDate.setDate(1);

    const revenue = await Invoice.aggregate([
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

    // Daily revenue for last 30 days
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

    res.status(200).json({
      success: true,
      data: {
        monthly: revenue.map((r) => ({
          period: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
          total: r.total,
          invoiceCount: r.count,
        })),
        daily: dailyRevenue.map((r) => ({ date: r._id, total: r.total })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Plans distribution: subscribers per plan
 */
const getPlansReport = async (req, res) => {
  try {
    const distribution = await Subscription.aggregate([
      { $match: { status: { $in: ["active", "trial"] } } },
      { $group: { _id: "$planId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Enrich with plan names
    const planIds = distribution.map((d) => d._id);
    const plans = await Plan.find({ _id: { $in: planIds } }).select("name").lean();
    const planMap = Object.fromEntries(plans.map((p) => [p._id.toString(), p.name]));

    res.status(200).json({
      success: true,
      data: distribution.map((d) => ({
        planId: d._id,
        planName: planMap[d._id?.toString()] || "Unknown",
        subscribers: d.count,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Churn report: canceled subscriptions
 */
const getChurnReport = async (req, res) => {
  try {
    const { months = 6 } = req.query;
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

    res.status(200).json({
      success: true,
      data: {
        monthlyChurn: canceled.map((c) => ({
          period: `${c._id.year}-${String(c._id.month).padStart(2, "0")}`,
          canceled: c.count,
        })),
        churnRate: parseFloat(churnRate),
        totalCanceled,
        totalActive,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Trials report
 */
const getTrialsReport = async (req, res) => {
  try {
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

    res.status(200).json({
      success: true,
      data: {
        activeTrials,
        expiredTrials,
        convertedTrials,
        conversionRate: expiredTrials + convertedTrials > 0
          ? ((convertedTrials / (expiredTrials + convertedTrials)) * 100).toFixed(2)
          : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Payments report
 */
const getPaymentsReport = async (req, res) => {
  try {
    const byStatus = await Payment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    const byGateway = await Payment.aggregate([
      { $group: { _id: "$gateway", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, { count: s.count, total: s.total }])),
        byGateway: Object.fromEntries(byGateway.map(g => [g._id || "unknown", { count: g.count, total: g.total }])),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getMrr,
  getArr,
  getRevenue,
  getPlansReport,
  getChurnReport,
  getTrialsReport,
  getPaymentsReport,
};
