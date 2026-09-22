const mongoose = require("mongoose");
const Store = require("../models/Store");
const User = require("../models/User");
const UserStore = require("../models/UserStore");
const Role = require("../models/Role");
const StoreDomain = require("../models/StoreDomain");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Invoice = require("../models/Invoice");
const AuditLog = require("../models/AuditLog");
const UsageCounter = require("../models/UsageCounter");
const PlanQuota = require("../models/PlanQuota");
const QuotaType = require("../models/QuotaType");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Team = require("../models/Team");
const Payment = require("../models/Payment");
const SoftLimitService = require("./SoftLimitService");
const AuditService = require("./AuditService");
const { emitEvent } = require("../lib/eventBus");

const MIN_REASON_LENGTH = 10;

const AUDIT_SEVERITY = {
  suspend: "critical",
  delete: "critical",
  activate: "low",
  restore: "medium",
};

const requireReason = (reason, action) => {
  const value = typeof reason === "string" ? reason.trim() : "";
  if (value.length < MIN_REASON_LENGTH) {
    const err = new Error(
      `Un motif d'au moins ${MIN_REASON_LENGTH} caractères est obligatoire pour l'action "${action}"`
    );
    err.code = "BAD_REQUEST";
    throw err;
  }
  return value;
};

const loadStoreOrThrow = async (storeId, { allowDeleted = false } = {}) => {
  if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
    const err = new Error("Identifiant de store invalide");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const store = await Store.findById(storeId);
  if (!store) {
    const err = new Error("Store not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (store.deletedAt && !allowDeleted) {
    const err = new Error("Store not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  return store;
};

const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

const normalizeStatus = (status) =>
  status === undefined || status === null ? null : String(status);

const buildHealthSignals = ({ store, subscription, quotaStates }) => {
  const signals = [];
  if (store.status === "suspended") signals.push("suspended");
  if (subscription?.status === "past_due") signals.push("past_due");
  if (store.status === "deleted") signals.push("deleted");

  const blockedQuotas = quotaStates.filter((q) => q.state === "blocked");
  if (blockedQuotas.length > 0) signals.push("soft_limit_blocked");

  const criticalQuotas = quotaStates.filter((q) => q.state === "critical");
  if (criticalQuotas.length > 0) signals.push("soft_limit_critical");

  const warningQuotas = quotaStates.filter((q) => q.state === "warning");
  if (warningQuotas.length > 0) signals.push("soft_limit_warning");

  let level = "ok";
  if (signals.includes("suspended") || signals.includes("deleted") || signals.includes("past_due")) {
    level = "critical";
  } else if (signals.includes("soft_limit_blocked")) {
    level = "critical";
  } else if (signals.includes("soft_limit_critical")) {
    level = "warning";
  } else if (signals.includes("soft_limit_warning")) {
    level = "warning";
  }

  return { level, signals };
};

const getStoreDetails = async (storeId) => {
  const id = toObjectId(storeId);
  if (!id) {
    const err = new Error("Invalid storeId");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const store = await Store.findById(id)
    .populate("ownerId", "name email phone country createdAt lastLogin status twoFactorEnabled")
    .populate("planId", "name slug status")
    .lean();

  if (!store) {
    const err = new Error("Store not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (store.deletedAt) {
    const err = new Error("Store not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const [
    domains,
    staffMemberships,
    invoices,
    auditLogs,
    totalCustomers,
    orderCount,
    orderRevenueAgg,
    productCount,
    invoiceCount,
    saasRevenuePaidAgg,
    subscription,
    quotaUsages,
    quotaTypes,
    planQuotas,
    errorsCount,
    failedWebhooks,
    teams,
  ] = await Promise.all([
    StoreDomain.find({ storeId: id }).lean(),
    UserStore.find({ storeId: id })
      .populate("userId", "name email status lastLogin twoFactorEnabled")
      .populate({
        path: "roleId",
        select: "name slug permissions",
        populate: { path: "permissions", select: "code scope module action" },
      })
      .lean(),
    Invoice.find({ storeId: id })
      .select("invoiceNumber issuedAt total status dueDate paidAt")
      .sort({ issuedAt: -1 })
      .limit(10)
      .lean(),
    AuditLog.find({ storeId: id })
      .populate("actorId", "name email")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    Customer.countDocuments({ storeId: id }),
    Order.countDocuments({ storeId: id }),
    Order.aggregate([
      { $match: { storeId, paymentStatus: "paid", status: { $nin: ["Cancel", "Refunded"] } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Product.countDocuments({ storeId: id }),
    Invoice.countDocuments({ storeId: id }),
    Invoice.aggregate([
      { $match: { storeId, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Subscription.findOne({ storeId: id }).lean(),
    UsageCounter.find({ storeId: id }).sort({ periodStart: -1 }).lean(),
    QuotaType.find({}).lean(),
    PlanQuota.find({ planId: store.planId }).lean(),
    AuditLog.countDocuments({ storeId: id, status: "failed" }),
    AuditLog.countDocuments({ storeId: id, status: "failed", module: "webhook" }),
    Team.find({ storeId: id })
      .populate("leader", "name email")
      .populate("members", "name email")
      .lean(),
  ]);

  const orderRevenue = orderRevenueAgg?.[0]?.total || 0;
  const saasRevenuePaid = saasRevenuePaidAgg?.[0]?.total || 0;

  const quotaTypeMap = new Map(quotaTypes.map((qt) => [qt.code, qt]));
  const planQuotaMap = new Map(planQuotas.map((pq) => [pq.quotaTypeCode, pq]));
  // UsageCounter is the preferred usage source (P7); StoreUsage is legacy.
  // Counters are sorted by periodStart desc, so the first hit per code is the
  // current billing period counter.
  const counterByCode = new Map();
  for (const counter of quotaUsages) {
    const codeKey = counter.quotaTypeCode || counter.quotaTypeId?.code;
    if (!codeKey || counterByCode.has(codeKey)) continue;
    counterByCode.set(codeKey, counter);
  }

  const quotas = [];
  const quotaStates = [];

  const buildQuotaRow = (code, label, unit, counter, limit, planQuotaForState) => {
    const used = counter ? Number(counter.used || 0) : 0;
    const pctValue = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null;
    let state = "ok";

    if (planQuotaForState && planQuotaForState.softLimitEnabled && pctValue !== null) {
      const blocked = Number(planQuotaForState.blockedThreshold ?? 100);
      const critical = Number(planQuotaForState.criticalThreshold ?? 95);
      const warning = Number(planQuotaForState.warningThreshold ?? 80);
      if (pctValue >= blocked) state = "blocked";
      else if (pctValue >= critical) state = "critical";
      else if (pctValue >= warning) state = "warning";
    } else if (!planQuotaForState && counter && counter.softLimitLevel && counter.softLimitLevel !== "normal") {
      state = counter.softLimitLevel;
    }

    return {
      code,
      label,
      unit: unit || "number",
      used,
      limit: limit === undefined ? null : limit,
      unlimited: limit === null || limit === undefined,
      state,
      percentage: pctValue,
      source: counter ? "usage_counter" : "no_counter",
      softLimitLevel: counter?.softLimitLevel || null,
      overridden: Boolean(counter?.overridden),
      periodStart: counter?.periodStart || null,
      periodEnd: counter?.periodEnd || null,
    };
  };

  for (const [code, qt] of quotaTypeMap) {
    const counter = counterByCode.get(code);

    const planQuota = planQuotaMap.get(code);
    let limit = null;
    if (planQuota && planQuota.limitValue !== undefined && planQuota.limitValue !== null) {
      limit = Number(planQuota.limitValue);
    } else if (qt.maxValue !== undefined && qt.maxValue !== null) {
      limit = Number(qt.maxValue);
    }

    quotas.push(buildQuotaRow(code, qt.name || code, qt.unit, counter, limit, planQuota));
    quotaStates.push({ code: qt.code, state: quotas[quotas.length - 1].state });
  }

  for (const [code, counter] of counterByCode) {
    if (quotaTypeMap.has(code)) continue;
    quotas.push(buildQuotaRow(code, code.replace(/_/g, " "), "number", counter, null, null));
  }

  const USAGE_ROW_ORDER = ["users", "products", "orders", "customers", "storage", "domains", "api_calls", "bandwidth"];
  quotas.sort((a, b) => {
    const indexA = USAGE_ROW_ORDER.indexOf(a.code);
    const indexB = USAGE_ROW_ORDER.indexOf(b.code);
    return (indexA < 0 ? 99 : indexA) - (indexB < 0 ? 99 : indexB) || a.label.localeCompare(b.label);
  });

  const usageRatio = quotas.length
    ? Math.round(quotas.reduce((sum, q) => sum + (q.limit > 0 ? (q.used / q.limit) * 100 : 0), 0) / quotas.length)
    : 0;

  // Teams inherit permissions from their members' store roles
  // (UserStore.roleId -> Role -> Permission). No Team.permissions field.
  const teamMemberIds = [...new Set(teams.flatMap((t) => (t.members || []).map((m) => String(m._id))))];
  const teamMemberships = teamMemberIds.length
    ? await UserStore.find({ storeId: id, userId: { $in: teamMemberIds } })
        .populate({ path: "roleId", select: "name slug permissions", populate: { path: "permissions", select: "code" } })
        .lean()
    : [];
  const roleByTeamMemberId = new Map();
  for (const membership of teamMemberships) {
    if (!membership.roleId) continue;
    roleByTeamMemberId.set(String(membership.userId?._id || membership.userId), membership.roleId);
  }
  const enrichedTeams = teams.map((t) => {
    const roleMap = new Map();
    for (const member of t.members || []) {
      const role = roleByTeamMemberId.get(String(member._id));
      if (!role) continue;
      const key = String(role._id);
      const entry = roleMap.get(key);
      if (entry) {
        entry.memberCount += 1;
      } else {
        roleMap.set(key, {
          _id: role._id,
          name: role.name,
          slug: role.slug,
          permissionCount: Array.isArray(role.permissions) ? role.permissions.length : 0,
          memberCount: 1,
        });
      }
    }
    return { ...t, inheritedRoles: [...roleMap.values()] };
  });

  // Billing aggregation (P0): what money moved for this store.
  const [billingInvoices, billingPayments] = await Promise.all([
    Invoice.find({ storeId: id }).sort({ issuedAt: -1, createdAt: -1 }).limit(50).lean(),
    Payment.find({ storeId: id }).populate("providerId", "name code").sort({ createdAt: -1 }).limit(100).lean(),
  ]);

  const subscriptionForBilling = subscription || {};
  const billingCurrency =
    subscriptionForBilling.priceSnapshot?.currency ||
    subscriptionForBilling.currency ||
    store.currency ||
    "USD";
  const baseMonthlyPrice = Number(subscriptionForBilling.priceSnapshot?.monthly ?? 0);
  const mrr =
    String(subscriptionForBilling.billingCycle || "monthly") === "yearly"
      ? Math.round((Number(subscriptionForBilling.priceSnapshot?.yearly ?? baseMonthlyPrice * 12) / 12) * 100) / 100
      : baseMonthlyPrice;
  const paidInvoiceList = billingInvoices.filter((inv) => inv.status === "paid");
  const unpaidInvoiceList = billingInvoices.filter((inv) => ["sent", "overdue"].includes(inv.status));
  const failedPaymentList = billingPayments.filter((p) => p.status === "failed");
  const refundedPaymentList = billingPayments.filter((p) => p.status === "refunded" || Number(p.refundedAmount || 0) > 0);
  const totalPaid = paidInvoiceList.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const outstanding = unpaidInvoiceList.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const refundAmount = refundedPaymentList.reduce((sum, p) => sum + Number(p.refundedAmount || 0), 0);
  const couponsApplied = [];
  for (const inv of billingInvoices) {
    for (const discount of inv.discounts || []) {
      if (!discount.code && !discount.couponId) continue;
      couponsApplied.push({
        invoiceId: inv._id,
        invoiceNumber: inv.invoiceNumber,
        code: discount.code || "",
        amount: Number(discount.discountAmount || 0),
        currency: inv.currency || billingCurrency,
        appliedAt: discount.appliedAt || inv.createdAt,
      });
    }
  }

  const transactions = [
    ...billingInvoices.map((inv) => ({
      _id: `invoice-${inv._id}`,
      date: inv.issuedAt || inv.createdAt,
      type: "invoice",
      reference: inv.invoiceNumber,
      amount: Number(inv.total || 0),
      currency: inv.currency || billingCurrency,
      status: inv.status,
      method: null,
      provider: null,
      transactionId: null,
      invoiceId: inv._id,
      paymentId: null,
      detail: {},
    })),
    ...billingPayments.map((p) => ({
      _id: `payment-${p._id}`,
      date: p.paidAt || p.createdAt,
      type: p.status === "refunded" || Number(p.refundedAmount || 0) > 0 ? "refund" : p.status === "failed" ? "attempt" : "payment",
      reference: p.transactionId || p.gatewayTransactionId || (p.orderId ? String(p.orderId) : ""),
      amount: Number(p.amount || 0),
      currency: (p.currency || billingCurrency).toUpperCase(),
      status: p.status,
      method: p.method || null,
      provider: p.providerId?.name || p.gateway || null,
      transactionId: p.gatewayTransactionId || p.transactionId || null,
      invoiceId: p.invoiceId || null,
      paymentId: p._id,
      refundedAmount: Number(p.refundedAmount || 0),
      failureReason: p.failureReason || null,
      attemptCount: p.attemptCount || 1,
      nextRetryAt: p.nextRetryAt || null,
      detail: {},
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const owner = store.ownerId || {};
  const staff = staffMemberships
    .filter((m) => m.userId)
    .map((m) => ({
      userId: m.userId._id,
      name: m.userId.name,
      email: m.userId.email,
      status: normalizeStatus(m.userId.status),
      membershipStatus: normalizeStatus(m.status),
      lastLogin: m.userId.lastLogin,
      twoFactorEnabled: m.userId.twoFactorEnabled || false,
      role: m.roleId
        ? { _id: m.roleId._id, name: m.roleId.name, slug: m.roleId.slug }
        : null,
    }));

  const health = buildHealthSignals({
    store,
    subscription,
    quotaStates,
  });

  const response = {
    ...store,
    ownerId: undefined,
    owner: {
      _id: owner._id,
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      country: owner.country,
      createdAt: owner.createdAt,
      lastLogin: owner.lastLogin,
      status: normalizeStatus(owner.status),
      twoFactorEnabled: owner.twoFactorEnabled || false,
    },
    ownerName: owner.name || owner.email || "N/A",
    subscriptionStatus: normalizeStatus(store.subscriptionStatus),
    plan: store.planId
      ? {
          id: store.planId._id,
          name: store.planId.name,
          slug: store.planId.slug,
          status: normalizeStatus(store.planId.status),
        }
      : null,
    trialEndsAt: store.trialEndsAt || null,
    domains,
    staff,
    metrics: {
      orderCount,
      orderRevenue,
      customerCount: totalCustomers,
      productCount,
      invoiceCount,
      saasRevenuePaid,
    },
    quotas,
    usageRatio,
    subscription: subscription
      ? {
          id: subscription._id,
          status: normalizeStatus(subscription.status),
          billingCycle: normalizeStatus(subscription.billingCycle),
          currentPeriodEnd: subscription.currentPeriodEnd || null,
          trialEndsAt: subscription.trialEndsAt || null,
          startedAt: subscription.startedAt || null,
        }
      : null,
    invoices,
    audit: auditLogs,
    health,
    maintenanceMode: Boolean(store.maintenance?.enabled),
    compliance: null,
    totalOrders: orderCount,
    totalCustomers,
    totalProducts: productCount,
    revenue: orderRevenue,
     activeAdmins: staff.filter((s) => s.membershipStatus === "active").length,
     adminList: staff,
     quotaRows: quotas,
     errorsCount,
     failedWebhooks,
     teams: enrichedTeams.map((t) => ({
       _id: t._id,
       name: t.name,
       slug: t.slug,
       description: t.description,
       department: t.department,
       leader: t.leader
         ? { _id: t.leader._id, name: t.leader.name, email: t.leader.email }
         : null,
       members: (t.members || []).map((m) => ({ _id: m._id, name: m.name, email: m.email })),
       memberCount: t.members?.length || 0,
       status: t.status || "active",
       inheritedRoles: t.inheritedRoles || [],
       isSystem: t.isSystem,
       createdAt: t.createdAt,
       updatedAt: t.updatedAt,
     })),
     billing: {
       summary: {
         currency: billingCurrency,
         mrr,
         totalPaid,
         outstanding,
         failedPayments: { count: failedPaymentList.length, amount: failedPaymentList.reduce((sum, p) => sum + Number(p.amount || 0), 0) },
         refunds: { count: refundedPaymentList.length, amount: refundAmount },
         nextBillingDate: subscriptionForBilling.nextBillingDate || null,
         subscriptionStatus: subscriptionForBilling.status || null,
       },
       transactions: transactions.slice(0, 60),
       coupons: couponsApplied.slice(0, 25),
     },
    };

  return response;
};

const listStores = async (filters = {}, pagination = {}) => {
  const {
    search = "",
    status,
    planId,
    subscriptionStatus,
    dateFrom,
    dateTo,
    ownerId,
  } = filters;

  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 25;
  const skip = (page - 1) * limit;

  const query = { deletedAt: null };

  if (status) query.status = status;
  if (planId) query.planId = toObjectId(planId);
  if (subscriptionStatus) query.subscriptionStatus = subscriptionStatus;
  if (ownerId) query.ownerId = toObjectId(ownerId);

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
      { domain: { $regex: search, $options: "i" } },
    ];
  }

  const total = await Store.countDocuments(query);
  const stores = await Store.find(query)
    .populate("ownerId", "name email")
    .populate("planId", "name slug")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    stores,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  };
};

const updateStore = async (storeId, updates, actorId = null) => {
  const store = await Store.findById(storeId);
  if (!store) {
    const err = new Error("Store not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const allowed = ["name", "slug", "domain", "planId", "billingCycle", "address", "category"];
  const updatePayload = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) updatePayload[key] = updates[key];
  }

  const updated = await Store.findByIdAndUpdate(storeId, { $set: updatePayload }, { new: true });

  await AuditService.logAction({
    actorType: "platform_admin",
    actorId: actorId || null,
    module: "Platform Store",
    action: "update",
    entityType: "store",
    entityId: storeId,
    status: "success",
    severity: "medium",
    changes: updatePayload,
  });

  return updated;
};

const transferStoreOwnership = async (storeId, newOwnerId, actorId = null) => {
  const session = await mongoose.startSession();
  let result;
  try {
    session.startTransaction();
    const store = await Store.findById(storeId).session(session);
    if (!store || store.deletedAt) {
      const err = new Error("Store not found");
      err.code = "NOT_FOUND";
      throw err;
    }

    const newOwner = await User.findOne({ _id: newOwnerId, deletedAt: null }).session(session);
    if (!newOwner) {
      const err = new Error("New owner not found");
      err.code = "NOT_FOUND";
      throw err;
    }
    if (["Suspended", "Blocked", "Archived", "Inactive"].includes(newOwner.status)) {
      const err = new Error("New owner has an invalid account status");
      err.code = "BAD_REQUEST";
      throw err;
    }

    // Owner memberships use the platform-scoped "store-owner" role (same
    // convention as storeService.createStore). Fall back to a store-scoped
    // owner role for stores that define their own.
    let ownerRole = await Role.findOne({
      scope: "platform",
      $or: [{ slug: "store-owner" }, { name: "Store Owner" }],
    }).session(session);
    if (!ownerRole) {
      ownerRole = await Role.findOne({
        scope: "store",
        storeId,
        $or: [{ slug: "store-owner" }, { name: "Store Owner" }],
      }).session(session);
    }
    if (!ownerRole) {
      const err = new Error("Store Owner role is not configured");
      err.code = "BAD_REQUEST";
      throw err;
    }

    const oldOwnerId = store.ownerUserId || store.ownerId;
    await UserStore.findOneAndUpdate(
      { userId: newOwnerId, storeId },
      { $set: { roleId: ownerRole._id, status: "active" } },
      { upsert: true, new: true, setDefaultsOnInsert: true, session }
    );
    if (oldOwnerId && String(oldOwnerId) !== String(newOwnerId)) {
      await UserStore.updateOne(
        { userId: oldOwnerId, storeId },
        { $set: { roleId: null, status: "active" } },
        { session }
      );
    }

    await Store.findByIdAndUpdate(
      storeId,
      { $set: { ownerId: newOwnerId, ownerUserId: newOwnerId } },
      { session, new: true }
    );
    await session.commitTransaction();
    result = { storeId, oldOwnerId, newOwnerId, ownerRoleId: ownerRole._id };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  await AuditService.logAction({
    actorType: "platform_admin",
    actorId: actorId || null,
    module: "Platform Store",
    action: "store.owner_changed",
    summary: `Store ownership transferred from ${result.oldOwnerId || "none"} to ${result.newOwnerId}`,
    entityType: "store",
    entityId: storeId,
    storeId,
    status: "success",
    severity: "critical",
    oldValue: { ownerUserId: result.oldOwnerId },
    newValue: { ownerUserId: result.newOwnerId },
  });
  emitEvent("store.owner_changed", { storeId, oldOwnerId: result.oldOwnerId, newOwnerId: result.newOwnerId, actorId });
  return result;
};

const auditLifecycle = async ({ action, store, actorId, reason, oldValue, newValue, actorType = "platform_admin" }) => {
  await AuditService.logAction({
    actorType,
    actorId: actorId || null,
    module: "Platform Store",
    action: `store.${action}`,
    summary: `Store "${store.name}" ${action}${reason ? `  ${reason}` : ""}`,
    entityType: "store",
    entityId: store._id,
    storeId: store._id,
    status: "success",
    severity: AUDIT_SEVERITY[action] || "medium",
    reason: reason || undefined,
    oldValue,
    newValue,
    metadata: reason ? { reason } : {},
  });
};

const suspendStore = async (storeId, { reason, actorId = null } = {}) => {
  const motif = requireReason(reason, "suspend");
  const store = await loadStoreOrThrow(storeId);

  if (store.status === "suspended") {
    const err = new Error("Ce store est déjà suspendu");
    err.code = "CONFLICT";
    throw err;
  }

  const previousStatus = store.status;
  const updated = await Store.findByIdAndUpdate(
    storeId,
    { $set: { status: "suspended", suspendedAt: new Date(), suspensionReason: motif } },
    { new: true }
  );

  await auditLifecycle({
    action: "suspend",
    store,
    actorId,
    reason: motif,
    oldValue: { status: previousStatus },
    newValue: { status: "suspended" },
  });

  emitEvent("store.suspended", {
    storeId: store._id,
    actorId,
    entityId: store._id,
    metadata: { storeName: store.name, reason: motif },
  });

  return updated;
};

const activateStore = async (storeId, { actorId = null, reason = null } = {}) => {
  const store = await loadStoreOrThrow(storeId);

  if (store.status === "active") {
    const err = new Error("Ce store est déjà actif");
    err.code = "CONFLICT";
    throw err;
  }

  const previousStatus = store.status;
  const updated = await Store.findByIdAndUpdate(
    storeId,
    { $set: { status: "active" }, $unset: { suspendedAt: 1, suspensionReason: 1 } },
    { new: true }
  );

  await auditLifecycle({
    action: "activate",
    store,
    actorId,
    reason: reason ? String(reason).trim() : null,
    oldValue: { status: previousStatus },
    newValue: { status: "active" },
  });

  emitEvent("store.activated", {
    storeId: store._id,
    actorId,
    entityId: store._id,
    metadata: { storeName: store.name },
  });

  return updated;
};

const softDeleteStore = async (storeId, { reason, actorId = null, actorType } = {}) => {
  const motif = requireReason(reason, "delete");
  const store = await loadStoreOrThrow(storeId);

  const deletedAt = new Date();
  const previousStatus = store.status;
  await Store.findByIdAndUpdate(storeId, {
    $set: {
      deletedAt,
      deletedBy: actorId,
      status: "deleted",
      deletionReason: motif,
      statusBeforeDeletion: previousStatus,
    },
  });

  await auditLifecycle({
    action: "delete",
    store,
    actorId,
    actorType,
    reason: motif,
    oldValue: { status: previousStatus, deletedAt: null },
    newValue: { status: "deleted", deletedAt },
  });

  emitEvent("store.deleted", {
    storeId: store._id,
    actorId,
    entityId: store._id,
    metadata: { storeName: store.name, reason: motif },
  });

  return { storeId: store._id, deletedAt, status: "deleted" };
};

const restoreStore = async (storeId, { actorId = null, reason = null, actorType } = {}) => {
  const store = await loadStoreOrThrow(storeId, { allowDeleted: true });

  if (!store.deletedAt) {
    const err = new Error("Ce store n'est pas supprimé");
    err.code = "CONFLICT";
    throw err;
  }

  const restoredStatus = store.statusBeforeDeletion === "suspended" ? "suspended" : "inactive";
  const updated = await Store.findByIdAndUpdate(
    storeId,
    {
      $set: { deletedAt: null, deletedBy: null, status: restoredStatus },
      $unset: { deletionReason: 1, statusBeforeDeletion: 1 },
    },
    { new: true }
  );

  await auditLifecycle({
    action: "restore",
    store,
    actorId,
    actorType,
    reason: reason ? String(reason).trim() : null,
    oldValue: { status: "deleted", deletedAt: store.deletedAt },
    newValue: { status: restoredStatus, deletedAt: null },
  });

  emitEvent("store.restored", {
    storeId: store._id,
    actorId,
    entityId: store._id,
    metadata: { storeName: store.name, status: restoredStatus },
  });

  return updated;
};

module.exports = {
  getStoreDetails,
  listStores,
  updateStore,
  transferStoreOwnership,
  suspendStore,
  activateStore,
  softDeleteStore,
  restoreStore,
  MIN_REASON_LENGTH,
};
