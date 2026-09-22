const mongoose = require("mongoose");
const SubscriptionService = require("../service/SubscriptionService");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const SubscriptionLifecycle = require("../service/subscriptionLifecycleService");

const lifecycleError = (res, err) => {
  if (err.code === "BAD_REQUEST") return res.status(400).json({ success: false, code: err.code, message: err.message });
  if (err.code === "NOT_FOUND") return res.status(404).json({ success: false, code: err.code, message: err.message });
  if (err.code === "CONFLICT") return res.status(409).json({ success: false, code: err.code, message: err.message });
  return res.status(500).json({ success: false, message: err.message });
};


const getAllSubscriptions = async (req, res) => {
  try {
    const { page, limit, status, storeId, planId, search, sort } = req.query;
    const result = await SubscriptionService.getAllSubscriptions({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      status,
      storeId,
      planId,
      search,
      sort: sort || "-createdAt",
    });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subscription id" });
    }
    const result = await SubscriptionService.getSubscriptionById(id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const upgradeSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subscription id" });
    }
    const result = await SubscriptionService.upgradeSubscription(req, res);
    res.status(200).json({ success: true, message: "Subscription upgraded successfully", data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const downgradeSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subscription id" });
    }
    const result = await SubscriptionService.downgradeSubscription(req, res);
    res.status(200).json({ success: true, message: "Subscription downgraded successfully", data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const suspendSubscription = async (req, res) => {
  try {
    const result = await SubscriptionLifecycle.suspendSubscription(req.params.id, {
      reason: req.body?.reason,
      actorId: req.user?._id || null,
    });
    res.status(200).json({ success: true, message: "Subscription suspended successfully", data: result });
  } catch (err) {
    lifecycleError(res, err);
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const { mode, reason } = req.body || {};
    const result = await SubscriptionLifecycle.cancelSubscription(req.params.id, {
      mode: mode || "at_period_end",
      reason,
      actorId: req.user?._id || null,
    });
    res.status(200).json({ success: true, message: "Subscription canceled successfully", data: result });
  } catch (err) {
    lifecycleError(res, err);
  }
};

const renewSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subscription id" });
    }
    const result = await SubscriptionService.renewSubscription(id, req.user?._id);
    res.status(200).json({ success: true, message: "Subscription renewed successfully", data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const resumeSubscription = async (req, res) => {
  try {
    const result = await SubscriptionLifecycle.resumeSubscription(req.params.id, {
      reason: req.body?.reason,
      actorId: req.user?._id || null,
    });
    res.status(200).json({ success: true, message: "Subscription resumed successfully", data: result });
  } catch (err) {
    lifecycleError(res, err);
  }
};

const extendTrial = async (req, res) => {
  try {
    const result = await SubscriptionLifecycle.extendTrial(req.params.id, {
      days: req.body?.days,
      reason: req.body?.reason,
      actorId: req.user?._id || null,
    });
    res.status(200).json({ success: true, message: "Trial extended successfully", data: result });
  } catch (err) {
    lifecycleError(res, err);
  }
};

const forceSubscriptionStatus = async (req, res) => {
  try {
    const result = await SubscriptionLifecycle.forceStatus(req.params.id, {
      status: req.body?.status,
      reason: req.body?.reason,
      actorId: req.user?._id || null,
    });
    res.status(200).json({ success: true, message: "Subscription status forced", data: result });
  } catch (err) {
    lifecycleError(res, err);
  }
};

const getTransitionMatrix = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      transitions: SubscriptionLifecycle.TRANSITIONS,
      terminalStatuses: SubscriptionLifecycle.TERMINAL_STATUSES,
      cancelModes: ["at_period_end", "immediate"],
    },
  });
};

const applyCouponToSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subscription id" });
    }
    if (!code || typeof code !== "string") {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }
    const result = await SubscriptionService.applyCouponToSubscription(id, code, req.user?._id);
    res.status(200).json({ success: true, message: "Coupon applied successfully", data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const assignPlanToStore = async (req, res) => {
  try {
    const { storeId, planId } = req.body;
    const billingCycle = req.body.billingCycle || "monthly";
    const trialDays = req.body.trialDays || 0;
    if (!storeId || !planId) {
      return res.status(400).json({ success: false, message: "storeId and planId are required" });
    }
    const result = await SubscriptionService.assignPlanToStore({ storeId, planId, billingCycle, trialDays, actor: req.user?._id });
    res.status(200).json({ success: true, message: "Plan assigned to store successfully", data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getSubscriptionHistory = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page, limit } = req.query;
    const result = await SubscriptionService.getSubscriptionHistory({ storeId, page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 20 });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllSubscriptionHistory = async (req, res) => {
  try {
    const { page, limit, storeId, planId, status, search, sort } = req.query;
    const result = await SubscriptionService.getAllSubscriptionHistory({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      storeId,
      planId,
      status,
      search,
      sort: sort || "-createdAt",
    });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllSubscriptionEvents = async (req, res) => {
  try {
    const { page, limit, storeId, planId, status, search, sort } = req.query;
    const result = await SubscriptionService.getAllSubscriptionEvents({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      storeId,
      planId,
      status,
      search,
      sort: sort || "-createdAt",
    });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTrialSubscriptions = async (req, res) => {
  try {
    const { page, limit, sort } = req.query;
    const result = await SubscriptionService.getTrialSubscriptions({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      sort: sort || "-createdAt",
    });
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMySubscription = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await User.findById(userId).select("storeIds currentStoreId");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const storeId = user.currentStoreId || user.storeIds?.[0];
    if (!storeId) {
      return res.status(400).json({ success: false, message: "No store selected" });
    }
    const subscription = await Subscription.findOne({ storeId, status: { $in: ["active", "trial", "past_due"] } })
      .populate("planId", "name slug pricing")
      .populate("storeId", "name");
    if (!subscription) {
      return res.status(404).json({ success: false, message: "No active subscription found" });
    }
    res.status(200).json({ success: true, data: subscription });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const retryFailedPayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid subscription id" });
    }
    const result = await SubscriptionService.retryFailedPayment(id, req.user?._id);
    res.status(200).json({ success: true, message: "Payment retry scheduled", data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const checkTrialEndings = async (req, res) => {
  try {
    const result = await SubscriptionService.checkTrialEndings();
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const processOverQuotaGracePeriods = async (req, res) => {
  try {
    const result = await SubscriptionService.processOverQuotaGracePeriods();
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  extendTrial,
  forceSubscriptionStatus,
  getTransitionMatrix,
  getAllSubscriptions,
  getSubscriptionById,
  upgradeSubscription,
  downgradeSubscription,
  suspendSubscription,
  cancelSubscription,
  renewSubscription,
  resumeSubscription,
  applyCouponToSubscription,
  assignPlanToStore,
  getSubscriptionHistory,
  getAllSubscriptionHistory,
  getAllSubscriptionEvents,
  getTrialSubscriptions,
  retryFailedPayment,
  checkTrialEndings,
  processOverQuotaGracePeriods,
  getMySubscription,
};