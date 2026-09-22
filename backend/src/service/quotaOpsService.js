const mongoose = require("mongoose");
const Overage = require("../models/Overage");
const OverageWaiver = require("../models/OverageWaiver");
const GracePeriod = require("../models/GracePeriod");
const Subscription = require("../models/Subscription");
const Store = require("../models/Store");
const AuditService = require("./AuditService");
const OverageService = require("./OverageService");
const { emitEvent } = require("../lib/eventBus");
const { requireReason, optionalReason } = require("../utils/requireReason");

const MAX_GRACE_EXTENSION_DAYS = 90;

const badRequest = (m) => {
  const e = new Error(m);
  e.code = "BAD_REQUEST";
  return e;
};
const notFound = (m) => {
  const e = new Error(m);
  e.code = "NOT_FOUND";
  return e;
};
const conflict = (m) => {
  const e = new Error(m);
  e.code = "CONFLICT";
  return e;
};

const audit = async ({ action, entityType, entityId, storeId, actorId, reason, severity, oldValue, newValue, metadata }) => {
  await AuditService.logAction({
    actorType: "platform_admin",
    actorId: actorId || null,
    module: "Platform Plan",
    action,
    summary: `${action} ${entityType} ${entityId}${reason ? `  ${reason}` : ""}`,
    entityType,
    entityId,
    storeId: storeId || null,
    status: "success",
    severity,
    reason: reason || null,
    oldValue,
    newValue,
    metadata: { ...(metadata || {}), ...(reason ? { reason } : {}) },
  });
};

const extendGracePeriod = async (id, { days, reason, actorId = null } = {}) => {
  const motif = requireReason(reason, "extend-grace");
  const extraDays = Number(days);
  if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > MAX_GRACE_EXTENSION_DAYS) {
    throw badRequest(`days doit être un entier entre 1 et ${MAX_GRACE_EXTENSION_DAYS}`);
  }
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw badRequest("Identifiant de période de gréce invalide");
  }

  const grace = await GracePeriod.findById(id);
  if (!grace) throw notFound("Période de gréce introuvable");
  if (["resolved", "escalated"].includes(grace.status)) {
    throw conflict(`Une période de gréce "${grace.status}" ne peut pas être prolongé`);
  }

  const base = grace.graceEndDate && grace.graceEndDate > new Date() ? grace.graceEndDate : new Date();
  const previousEnd = grace.graceEndDate;
  const newEnd = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);

  grace.graceEndDate = newEnd;
  grace.status = "active";
  await grace.save();

  await audit({
    action: "grace_period.extend",
    entityType: "grace_period",
    entityId: grace._id,
    storeId: grace.storeId,
    actorId,
    reason: motif,
    severity: "medium",
    oldValue: { graceEndDate: previousEnd, status: grace.status },
    newValue: { graceEndDate: newEnd, status: "active" },
    metadata: { days: extraDays, quotaTypeCode: grace.quotaTypeCode },
  });

  emitEvent("grace_period.extended", {
    storeId: grace.storeId,
    entityId: grace._id,
    metadata: { days: extraDays, newEnd, reason: motif },
  });

  return grace;
};

const waiveOverage = async (overageRuleId, { subscriptionId, periodStart, periodEnd, reason, actorId = null } = {}) => {
  const motif = requireReason(reason, "waive");

  if (!overageRuleId || !mongoose.Types.ObjectId.isValid(overageRuleId)) {
    throw badRequest("Identifiant de règle d'overage invalide");
  }
  if (!subscriptionId || !mongoose.Types.ObjectId.isValid(subscriptionId)) {
    throw badRequest("subscriptionId est obligatoire");
  }

  const rule = await Overage.findById(overageRuleId);
  if (!rule) throw notFound("Régle d'overage introuvable");

  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw notFound("Abonnement introuvable");

  const start = periodStart ? new Date(periodStart) : subscription.currentPeriodStart || new Date();
  const end = periodEnd ? new Date(periodEnd) : subscription.currentPeriodEnd || new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw badRequest("periodStart/periodEnd invalides");
  }
  if (start > end) {
    throw badRequest("periodStart doit précéder periodEnd");
  }

  const before = await OverageService.calculateOverage({ subscriptionId, periodStart: start, periodEnd: end });
  const line = (before.items || []).find((i) => String(i.overageRuleId) === String(overageRuleId));

  let waiver;
  try {
    waiver = await OverageWaiver.create({
      overageRuleId,
      subscriptionId,
      storeId: subscription.storeId,
      quotaTypeCode: rule.quotaTypeCode,
      periodStart: start,
      periodEnd: end,
      waivedAmount: line ? line.amount : 0,
      currency: line ? line.currency : subscription.currency || "USD",
      reason: motif,
      waivedBy: actorId,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw conflict("Cette surconsommation est déjà exonéré pour cette période");
    }
    throw err;
  }

  const after = await OverageService.calculateOverage({ subscriptionId, periodStart: start, periodEnd: end });

  await audit({
    action: "overage.waive",
    entityType: "overage_waiver",
    entityId: waiver._id,
    storeId: subscription.storeId,
    actorId,
    reason: motif,
    severity: "medium",
    oldValue: { total: before.total },
    newValue: { total: after.total },
    metadata: {
      overageRuleId: String(overageRuleId),
      subscriptionId: String(subscriptionId),
      quotaTypeCode: rule.quotaTypeCode,
      waivedAmount: waiver.waivedAmount,
    },
  });

  emitEvent("overage.waived", {
    storeId: subscription.storeId,
    entityId: waiver._id,
    metadata: { waivedAmount: waiver.waivedAmount, reason: motif },
  });

  return { waiver, totalBefore: before.total, totalAfter: after.total };
};

const getOverview = async ({ storeId, page = 1, limit = 20 } = {}) => {
  const storeFilter = {};
  if (storeId) {
    if (!mongoose.Types.ObjectId.isValid(storeId)) throw badRequest("storeId invalide");
    storeFilter.storeId = new mongoose.Types.ObjectId(storeId);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const activeGrace = await GracePeriod.find({ ...storeFilter, status: "active" })
    .sort({ graceEndDate: 1 })
    .lean();

  const waivers = await OverageWaiver.find({ ...storeFilter, status: "waived" }).lean();
  const waivedByStore = new Map();
  for (const w of waivers) {
    const key = String(w.storeId);
    waivedByStore.set(key, (waivedByStore.get(key) || 0) + (w.waivedAmount || 0));
  }

  const storeIds = new Set([
    ...activeGrace.map((g) => String(g.storeId)),
    ...waivers.map((w) => String(w.storeId)),
  ]);

  if (storeId) storeIds.add(String(storeId));

  const ids = [...storeIds].map((s) => new mongoose.Types.ObjectId(s));
  const total = ids.length;
  const pageIds = ids.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  const [stores, subscriptions] = await Promise.all([
    Store.find({ _id: { $in: pageIds } }).select("name status deletedAt").lean(),
    Subscription.find({ storeId: { $in: pageIds } })
      .select("storeId status planId currentPeriodStart currentPeriodEnd overQuotaItems")
      .lean(),
  ]);

  const storeMap = new Map(stores.map((s) => [String(s._id), s]));
  const subMap = new Map(subscriptions.map((s) => [String(s.storeId), s]));

  const rows = [];
  for (const sid of pageIds.map(String)) {
    const subscription = subMap.get(sid);
    let overage = null;
    if (subscription) {
      try {
        overage = await OverageService.calculateOverage({ subscriptionId: subscription._id });
      } catch (err) {
        overage = null;
      }
    }

    rows.push({
      storeId: sid,
      store: storeMap.get(sid) || null,
      subscription: subscription
        ? { _id: subscription._id, status: subscription.status, planId: subscription.planId }
        : null,
      softLimits: subscription?.overQuotaItems || [],
      activeGracePeriods: activeGrace.filter((g) => String(g.storeId) === sid),
      overage: overage
        ? {
            items: overage.items,
            total: overage.total,
            waivedItems: overage.waivedItems,
            waivedTotal: overage.waivedTotal,
            currency: overage.currency,
          }
        : null,
      waivedTotalAllTime: waivedByStore.get(sid) || 0,
    });
  }

  return {
    rows,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  };
};

module.exports = {
  extendGracePeriod,
  waiveOverage,
  getOverview,
  MAX_GRACE_EXTENSION_DAYS,
};
