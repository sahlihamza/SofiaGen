const dayjs = require("dayjs");
const GracePeriod = require("../models/GracePeriod");
const Subscription = require("../models/Subscription");
const StoreUsage = require("../models/StoreUsage");
const QuotaType = require("../models/QuotaType");

const createGracePeriod = async ({ subscriptionId, storeId, quotaTypeId, quotaTypeCode, graceDays, reason, metadata }) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");

  const quotaType = quotaTypeId
    ? await QuotaType.findById(quotaTypeId)
    : await QuotaType.findOne({ code: String(quotaTypeCode).trim().toLowerCase() });
  if (!quotaType) throw new Error("Quota type not found");

  const now = new Date();
  const graceStartDate = now;
  const graceEndDate = dayjs(now).add(graceDays || 7, "day").toDate();

  const existingActive = await GracePeriod.findOne({
    subscriptionId,
    quotaTypeCode: quotaType.code,
    status: "active",
  });
  if (existingActive) {
    throw new Error("An active grace period already exists for this subscription and quota type");
  }

  const gracePeriod = await GracePeriod.create({
    subscriptionId,
    storeId,
    quotaTypeId: quotaType._id,
    quotaTypeCode: quotaType.code,
    graceStartDate,
    graceEndDate,
    status: "active",
    reason: reason || "Over-quota grace period",
    metadata,
  });

  return gracePeriod;
};

const getGracePeriods = async ({ page = 1, limit = 20, status = "", storeId = "", subscriptionId = "", quotaTypeCode = "", sort = "-createdAt" } = {}) => {
  const query = {};
  if (status) query.status = status;
  if (storeId) query.storeId = storeId;
  if (subscriptionId) query.subscriptionId = subscriptionId;
  if (quotaTypeCode) query.quotaTypeCode = String(quotaTypeCode).trim().toLowerCase();

  const skip = (page - 1) * limit;
  const total = await GracePeriod.countDocuments(query);
  const docs = await GracePeriod.find(query)
    .populate("subscriptionId", "status billingCycle")
    .populate("storeId", "name")
    .populate("quotaTypeId", "code name")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    data: docs,
    pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / limit) },
  };
};

const getGracePeriodById = async (id) => {
  const gracePeriod = await GracePeriod.findById(id)
    .populate("subscriptionId", "status billingCycle")
    .populate("storeId", "name")
    .populate("quotaTypeId", "code name");
  if (!gracePeriod) throw new Error("Grace period not found");
  return gracePeriod;
};

const resolveGracePeriod = async (id, resolutionNote, actor) => {
  const gracePeriod = await GracePeriod.findById(id);
  if (!gracePeriod) throw new Error("Grace period not found");
  if (gracePeriod.status !== "active") throw new Error("Grace period is not active");

  gracePeriod.status = "resolved";
  gracePeriod.resolvedAt = new Date();
  gracePeriod.resolutionNote = resolutionNote || "Grace period resolved";
  await gracePeriod.save();

  return gracePeriod;
};

const escalateGracePeriod = async (id, actor) => {
  const gracePeriod = await GracePeriod.findById(id);
  if (!gracePeriod) throw new Error("Grace period not found");
  if (gracePeriod.status !== "active") throw new Error("Grace period is not active");

  gracePeriod.status = "escalated";
  await gracePeriod.save();

  return gracePeriod;
};

const expireGracePeriods = async () => {
  const now = new Date();
  const expired = await GracePeriod.updateMany(
    { status: "active", graceEndDate: { $lt: now } },
    { status: "expired" }
  );
  return expired;
};

const getActiveGracePeriods = async () => {
  return GracePeriod.find({ status: "active" })
    .populate("subscriptionId", "status billingCycle")
    .populate("storeId", "name")
    .populate("quotaTypeId", "code name")
    .sort({ graceEndDate: 1 });
};

module.exports = {
  createGracePeriod,
  getGracePeriods,
  getGracePeriodById,
  resolveGracePeriod,
  escalateGracePeriod,
  expireGracePeriods,
  getActiveGracePeriods,
};