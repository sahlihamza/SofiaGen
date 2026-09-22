const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const mongoose = require("mongoose");
const router = express.Router();
const Store = require("../models/Store");
const User = require("../models/User");
const userService = require("../service/userService");
const UserStore = require("../models/UserStore");
const Role = require("../models/Role");
const StoreDomain = require("../models/StoreDomain");
const StoreUsageService = require("../service/StoreUsageService");
const SoftLimitService = require("../service/SoftLimitService");
const { loadUser, resolveAuthorizationContext, hasPermission, hasAnyPermission, requireStoreAccess } = require("../middleware/auth");
const { emitEvent } = require("../lib/eventBus");
const storeService = require("../service/storeService");
const PlatformStoreService = require("../service/PlatformStoreService");
const AuditService = require("../service/AuditService");
const GeneralSettings = require("../models/GeneralSettings");
const ProductSettings = require("../models/ProductSettings");
const Country = require("../models/Country");
const Currency = require("../models/Currency");
const roleService = require("../service/RoleService");
const TeamService = require("../service/TeamService");
const InvitationService = require("../service/InvitationService");
const DomainVerificationService = require("../service/DomainVerificationService");
const ApiKeyService = require("../service/ApiKeyService");
const StoreWebhookService = require("../service/StoreWebhookService");
const StoreWebhook = require("../models/StoreWebhook");
const BackupJobService = require("../service/BackupJobService");
const WebhookLog = require("../models/WebhookLog");
const ExportJob = require("../models/ExportJob");
const ApiKey = require("../models/ApiKey");
const BackupJob = require("../models/BackupJob");
const ShippingZoneService = require("../service/ShippingZoneService");
const ShippingZone = require("../models/ShippingZone");
const ShippingClass = require("../models/ShippingClass");
const ShippingSettings = require("../models/ShippingSettings");
const PickupLocation = require("../models/PickupLocation");
const logger = require("../config/logger");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const OrderItem = require("../models/OrderItem");
const Invoice = require("../models/Invoice");
const AuditLog = require("../models/AuditLog");
const StoreUsage = require("../models/StoreUsage");
const QuotaType = require("../models/QuotaType");
const Backup = require("../models/Backup");
const ThemeService = require("../service/ThemeService");
const PageProvisioningService = require("../service/PageProvisioningService");

const DEFAULT_COUNTRY_ISO2 = "TN";

// Helper: échappe les caractères spéciaux regex
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Validate domain name (basic, rejects spaces and invalid labels)
const isValidDomain = (d) => {
  if (!d || typeof d !== "string") return false;
  const domain = d.trim();
  // domain must contain at least one dot and valid labels
  const domainRegex = /^(?!-)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
  return domainRegex.test(domain);
};

// resolveStoreOwner used to be duplicated here (a weaker, non-transactional
// copy of storeService.js's own resolveStoreOwner)  removed along with the
// inline store-creation code it only existed to support (SO-04): the POST /
// and /:id/duplicate routes now delegate to storeService.createStore, which
// owns owner resolution itself.

// GET all stores
router.get("/", loadUser, resolveAuthorizationContext, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const accessibleStoreIds = new Set([
      ...(user?.storeIds || []),
      user?.currentStoreId,
    ].filter(Boolean).map((id) => String(id)));

    const stores = await userService.getStoresForUser(req.userId);
    const filteredStores = stores;






    // Use currentStoreId as the single source of truth for the user's
    // selected store in the admin dashboard (replaces the deprecated
    // selectedStore field).
    const selectedStoreId = user?.currentStoreId?.toString();

    const annotatedStores = filteredStores.map((store) => {
      const obj = store.toObject({ flattenMaps: true });
      const owner = obj.ownerId || {};
      return {
        ...obj,
        ownerId: undefined,
        owner: {
          _id: owner._id,
          name: owner.name,
          email: owner.email,
        },
        ownerName: owner.name || owner.email || "N/A",
        isSelected: store._id.toString() === selectedStoreId,
      };
    });

    res.json(annotatedStores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CHECK store name availability
router.get("/check-name", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || !name.trim()) {
      return res.json({ available: false, message: "Name is required" });
    }

    const existing = await Store.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") },
    });

    if (existing) {
      return res.json({ available: false, message: `A store named "${name}" already exists` });
    }

    res.json({ available: true, message: "Name is available" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CHECK subdomain availability
router.get("/check-subdomain", async (req, res) => {
  try {
    const { subdomain } = req.query;

    if (!subdomain || !subdomain.trim()) {
      return res.json({ available: false, message: "Subdomain is required" });
    }

    const normalized = String(subdomain).trim().toLowerCase();
    const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

    if (!subdomainRegex.test(normalized)) {
      return res.json({ available: false, message: "Subdomain format is invalid" });
    }

    const existing = await Store.findOne({ subdomain: normalized });

    if (existing) {
      return res.json({ available: false, message: `Subdomain "${normalized}" is already taken` });
    }

    res.json({ available: true, message: "Subdomain is available" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Store domains endpoints (placed before ":id" route to avoid param conflicts) ---

// GET domains for a store
router.get(
  "/:id/domains",
  loadUser, resolveAuthorizationContext, requireStoreAccess(),
  hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]),
  async (req, res) => {
  try {
    const domains = await StoreDomain.find({ storeId: req.params.id });
    res.json(domains);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE domain for a store (unique across all domains)
router.post(
  "/:id/domains",
  loadUser, resolveAuthorizationContext, requireStoreAccess(),
  hasAnyPermission(["online store", "create"], ["store", "create"], ["stores", "create"]),
  async (req, res) => {
  try {
    // Clients can only name the domain and choose it primary. DNS/SSL state is
    // determined server-side by DomainVerificationService  never from req.body.
    const { domain, isPrimary } = req.body;

    if (!domain || !domain.trim()) {
      return res.status(400).json({ message: "Domain is required" });
    }

    if (!isValidDomain(domain)) {
      return res.status(400).json({ message: "Domain format is invalid" });
    }

    try {
      DomainVerificationService.assertDomainEligible(domain);
    } catch (eligibilityError) {
      return res.status(400).json({ message: eligibilityError.message });
    }

    const existing = await StoreDomain.findOne({
      domain: { $regex: new RegExp(`^${escapeRegex(domain.trim())}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({ message: `Domain '${domain}' already exists` });
    }

    // SO-15: same gap as staff  usage was only ever counted after the
    // fact, never checked against the plan's actual "domains" limit first.
    const quotaCheck = await SoftLimitService.checkQuotaAvailable(req.params.id, "domains", 1);
    if (!quotaCheck.allowed) {
      return res.status(409).json({
        message: `Quota de domaines atteint pour cette boutique (${quotaCheck.used}/${quotaCheck.limit})`,
        code: "QUOTA_EXCEEDED",
      });
    }

    if (isPrimary) {
      await StoreDomain.updateMany({ storeId: req.params.id }, { $set: { isPrimary: false } });
    }

    const saved = await StoreDomain.create({
      storeId: req.params.id,
      domain: domain.trim().toLowerCase(),
      type: "custom",
      isPrimary: !!isPrimary,
    });

    try {
      await StoreUsageService.incrementUsage(req.params.id, "domains", 1);
    } catch (err) {
      console.error("Failed to increment domain usage for store:", err.message);
    }

    // First verification pass in the background; the UI also has an explicit Verify action.
    DomainVerificationService.verifyStoreDomainDocument(saved).catch((err) => {
      console.error("Background domain verification failed:", err.message);
    });

    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Re-check a domain's DNS + SSL state (server-side determination) ---
router.post(
  "/:id/domains/:domainId/verify",
  loadUser, resolveAuthorizationContext, requireStoreAccess(),
  hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]),
  async (req, res) => {
    try {
      const updated = await DomainVerificationService.verifyById(req.params.domainId, req.params.id);
      res.json(updated);
    } catch (err) {
      if (err.name === "NotFound") return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err.message });
    }
  }
);


// --- Store detail tab endpoints ---

const analyticsCache = new Map();
const ANALYTICS_CACHE_TTL = 5 * 60 * 1000;

// GET analytics for a store
// Window-bounded reads only (never full history) + 5-minute cache.
router.get("/:id/analytics", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const storeId = req.params.id;
    const range = ["7d", "30d", "90d", "12m", "custom"].includes(req.query.range) ? req.query.range : "30d";
    const now = new Date();
    let start;
    let end = now;
    if (range === "custom") {
      const from = req.query.from ? new Date(req.query.from) : null;
      const to = req.query.to ? new Date(req.query.to) : null;
      start = from && !Number.isNaN(from.getTime()) ? from : new Date(now.getTime() - 30 * 86400000);
      end = to && !Number.isNaN(to.getTime()) ? to : now;
    } else {
      const days = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 }[range];
      start = new Date(now.getTime() - days * 86400000);
    }

    const granularity = range === "12m" ? "month" : "day";
    const cacheKey = `${storeId}:${range}:${start.toISOString()}:${end.toISOString()}`;
    const cached = analyticsCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return res.json({ ...cached.data, cached: true });
    }

    const windowMatch = { storeId, createdAt: { $gte: start, $lte: end } };
    const windowOrders = await Order.find(windowMatch).select("total paymentStatus status customerId").lean();

    const isPaid = (o) => o.paymentStatus === "paid" && !["Cancel", "Refunded"].includes(o.status);
    const paidOrders = windowOrders.filter(isPaid);
    const refundedOrders = windowOrders.filter((o) => o.paymentStatus === "refunded" || o.status === "Refunded");
    const cancelledOrders = windowOrders.filter((o) => o.status === "Cancel");

    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const ordersCount = windowOrders.length;
    const avgOrderValue = paidOrders.length > 0 ? Math.round(revenue / paidOrders.length) : 0;

    const [customersTotal, newCustomers] = await Promise.all([
      Customer.countDocuments({ storeId }),
      Customer.countDocuments({ storeId, createdAt: { $gte: start, $lte: end } }),
    ]);

    // New vs returning: paying customers whose account was created inside the window
    const customerIds = [...new Set(paidOrders.map((o) => String(o.customerId || "")))].filter(Boolean);
    let newBuyers = 0;
    let returningBuyers = 0;
    if (customerIds.length > 0) {
      const buyers = await Customer.find({ _id: { $in: customerIds } }).select("createdAt").lean();
      for (const buyer of buyers) {
        if (buyer.createdAt && buyer.createdAt >= start) newBuyers += 1;
        else returningBuyers += 1;
      }
    }

    // Revenue trend grouped by day/month over the window only
    const trendMap = new Map();
    for (const order of paidOrders) {
      const date = new Date(order.createdAt);
      const key = granularity === "month" ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : date.toISOString().slice(0, 10);
      trendMap.set(key, (trendMap.get(key) || 0) + Number(order.total || 0));
    }
    const revenueTrend = [...trendMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([label, value]) => ({ label, value: Math.round(value) }));

    const paymentStatuses = await Payment.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId), createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const paymentsByStatus = Object.fromEntries(paymentStatuses.map((entry) => [entry._id, entry.count]));
    const terminalPayments = (paymentsByStatus.paid || 0) + (paymentsByStatus.failed || 0);
    const paymentSuccessRate = terminalPayments > 0 ? Math.round(((paymentsByStatus.paid || 0) / terminalPayments) * 100) : null;

    const refundRate = ordersCount > 0 ? Math.round((refundedOrders.length / ordersCount) * 100) : null;
    const cancellationRate = ordersCount > 0 ? Math.round((cancelledOrders.length / ordersCount) * 100) : null;

    // Top products & categories from line items of this window's orders
    const orderIds = windowOrders.map((o) => o._id);
    let topProducts = [];
    let topCategories = [];
    if (orderIds.length > 0) {
      const items = await OrderItem.find({ orderId: { $in: orderIds } }).select("productId productName quantity total").lean();
      const productMap = new Map();
      for (const item of items) {
        const key = String(item.productId || item.productName || "unknown");
        const entry = productMap.get(key) || { name: item.productName || "Unknown product", quantity: 0, revenue: 0 };
        entry.quantity += Number(item.quantity || 0);
        entry.revenue += Number(item.total || 0);
        productMap.set(key, entry);
      }
      topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      const productIds = [...productMap.keys()].filter((key) => /^[a-f\d]{24}$/i.test(key));
      const products = productIds.length > 0 ? await Product.find({ _id: { $in: productIds } }).select("category").populate("category", "name").lean() : [];
      const categoryByProduct = new Map(products.map((p) => [String(p._id), p.category?.name || "Uncategorized"]));
      const categoryMap = new Map();
      for (const item of items) {
        const categoryName = categoryByProduct.get(String(item.productId)) || "Uncategorized";
        const entry = categoryMap.get(categoryName) || { name: categoryName, orders: 0, revenue: 0 };
        entry.orders += Number(item.quantity || 0);
        entry.revenue += Number(item.total || 0);
        categoryMap.set(categoryName, entry);
      }
      topCategories = [...categoryMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }

    const data = {
      range,
      window: { start, end },
      summary: {
        revenue,
        orders: ordersCount,
        paidOrders: paidOrders.length,
        aov: avgOrderValue,
        customersTotal,
        newCustomers,
        refundRate,
        cancellationRate,
        paymentSuccessRate,
      },
      newVsReturning: { newBuyers, returningBuyers },
      payments: {
        byStatus: paymentsByStatus,
        successRate: paymentSuccessRate,
      },
      revenueTrend,
      topProducts,
      topCategories,
      notes: {
        conversionRate: null,
        traffic: null,
        cartAbandonment: null,
        reason: "Conversion, cart abandonment and raw traffic require visitor tracking which is not instrumented yet; the previous orders/customers formula was not a real conversion rate.",
      },
      generatedAt: new Date().toISOString(),
    };

    analyticsCache.set(cacheKey, { expires: Date.now() + ANALYTICS_CACHE_TTL, data });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET API keys for a store
router.get("/:id/api-keys", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const keys = await ApiKeyService.list(req.params.id);
    res.json(keys);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET webhooks for a store
router.get("/:id/webhooks", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const webhooks = await StoreWebhookService.list(req.params.id);
    res.json(webhooks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET backups for a store
router.get("/:id/backups", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const backups = await BackupJobService.list(req.params.id);
    res.json(backups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE backup for a store (async job: queued -> running -> completed)
router.post("/:id/backups", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "create"], ["store", "create"], ["stores", "create"]), async (req, res) => {
  try {
    const job = await BackupJobService.create(req.params.id, req.body || {}, req.userId);
    res.status(202).json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify a backup artifact against its stored checksum
router.post("/:id/backups/:jobId/verify", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    const result = await BackupJobService.verify(req.params.id, req.params.jobId);
    res.json(result);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// Restore a backup artifact to the store (configuration only)
router.post("/:id/backups/:jobId/restore", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    const result = await BackupJobService.restore(req.params.id, req.params.jobId, req.userId);
    res.status(200).json(result);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    if (err.name === "Conflict" || err.status === 409) return res.status(409).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// Download the backup artifact
router.get("/:id/backups/:jobId/download", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const { buffer, fileName } = await BackupJobService.readFileForDownload(req.params.id, req.params.jobId);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// DELETE a backup job and its artifact
router.delete("/:id/backups/:jobId", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "delete"], ["store", "delete"], ["stores", "delete"]), async (req, res) => {
  try {
    const result = await BackupJobService.remove(req.params.id, req.params.jobId);
    res.json(result);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// GET operational logs for a store
// Shared filter builder for the store audit tab (Logs ` Audit: this is the
// who-did-what trail; technical logs come from their own sources).
const buildAuditQuery = (storeId, query) => {
  const { action, module: moduleFilter, entityType, severity, status, actorId, requestId, dateFrom, dateTo } = query;
  const filter = { storeId };

  if (action) filter.action = { $regex: escapeRegex(String(action).toLowerCase()), $options: "i" };
  if (moduleFilter) filter.module = { $regex: escapeRegex(String(moduleFilter)), $options: "i" };
  if (entityType) filter.entityType = { $regex: escapeRegex(String(entityType)), $options: "i" };
  if (severity && ["low", "medium", "high", "critical"].includes(severity)) filter.severity = severity;
  if (status && ["success", "failed"].includes(status)) filter.status = status;
  if (requestId) filter.requestId = String(requestId);
  if (actorId && mongoose.Types.ObjectId.isValid(actorId)) filter.actorId = new mongoose.Types.ObjectId(actorId);
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom && !Number.isNaN(new Date(dateFrom).getTime())) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo && !Number.isNaN(new Date(dateTo).getTime())) {
      const to = dateTo.length === 10 ? `${dateTo}T23:59:59.999Z` : dateTo;
      filter.createdAt.$lte = new Date(to);
    }
  }
  return filter;
};

router.get("/:id/logs", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const filter = buildAuditQuery(req.params.id, req.query);

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    res.json({
      logs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET security data for a store
// No artificial single score: a transparent status (good / attention /
// critical) backed by explicit reasons, plus raw facts per section.
router.get("/:id/security", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const storeId = req.params.id;
    const now = new Date();
    const since30d = new Date(now.getTime() - 30 * 86400000);

    const [store, memberships, failedLogins30d, securityEvents, domainDocs, apiKeyStats, webhookStats] = await Promise.all([
      Store.findById(storeId).select("ownerId name").lean(),
      UserStore.find({ storeId })
        .populate("userId", "name email status twoFactorEnabled")
        .populate("roleId", "name")
        .lean(),
      AuditLog.countDocuments({ storeId, status: "failed", module: "auth", createdAt: { $gte: since30d } }),
      AuditLog.find({
        storeId,
        $or: [
          { action: /^api_key\./ },
          { action: /^store\.owner_changed/ },
          { action: /^webhook\./ },
          { action: /^settings\.updated/ },
          { action: /^permission_changed/ },
          { severity: "critical" },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      StoreDomain.find({ storeId }).select("domain isPrimary verified ssl dnsStatus sslExpiresAt").lean(),
      ApiKey.aggregate([
        { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      StoreWebhook.aggregate([
        { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const activeMemberships = memberships.filter((m) => m.status === "active" && m.userId);
    const suspendedMemberships = memberships.filter((m) => m.status === "suspended").length;
    const owner = store?.ownerId ? await User.findById(store.ownerId).select("twoFactorEnabled status").lean() : null;

    const staffTotal = activeMemberships.length;
    const staffWith2FA = activeMemberships.filter((m) => m.userId?.twoFactorEnabled).length;

    const rolesMap = new Map();
    for (const membership of activeMemberships) {
      const roleName = membership.roleId?.name || "No role";
      rolesMap.set(roleName, (rolesMap.get(roleName) || 0) + 1);
    }
    const roles = [...rolesMap.entries()]
      .map(([name, count]) => ({ name, count, privileged: /admin|owner/i.test(name) }))
      .sort((a, b) => b.count - a.count);

    const domains = {
      total: domainDocs.length,
      verified: domainDocs.filter((d) => d.verified).length,
      sslActive: domainDocs.filter((d) => d.ssl).length,
      sslExpired: domainDocs.filter((d) => d.sslExpiresAt && new Date(d.sslExpiresAt).getTime() < now.getTime()).length,
    };

    const apiKeys = { active: 0, revoked: 0 };
    for (const entry of apiKeyStats) {
      if (entry._id === "active") apiKeys.active = entry.count;
      if (entry._id === "revoked") apiKeys.revoked = entry.count;
    }
    const expiredStillActive = await ApiKey.countDocuments({
      storeId,
      status: "active",
      expiresAt: { $ne: null, $lt: now },
    });
    apiKeys.expiredStillActive = expiredStillActive;

    const webhooks = { active: 0, total: 0 };
    for (const entry of webhookStats) {
      webhooks.total += entry.count;
      if (entry._id === "active") webhooks.active = entry.count;
    }

    // Transparent rules  every non-good status comes with its reason.
    const reasons = [];
    let hasCritical = false;
    let hasAttention = false;
    const push = (level, text) => {
      if (level === "critical") hasCritical = true;
      if (level === "attention") hasAttention = true;
      reasons.push({ level, text });
    };

    if (!owner?.twoFactorEnabled) push("attention", "Owner account does not have two-factor authentication enabled.");
    else push("good", "Owner account has two-factor authentication enabled.");

    if (staffTotal > 0) {
      if (staffWith2FA < staffTotal) push("attention", `${staffTotal - staffWith2FA} of ${staffTotal} active admins have not enabled two-factor authentication.`);
      else push("good", "All active admins have two-factor authentication enabled.");
    }

    if (failedLogins30d >= 25) push("critical", `${failedLogins30d} failed login attempts in the last 30 days  possible credential stuffing.`);
    else if (failedLogins30d > 0) push("attention", `${failedLogins30d} failed login attempts in the last 30 days.`);
    else push("good", "No failed login attempts recorded in the last 30 days.");

    if (domains.total === 0) push("attention", "No custom domain configured  the storefront runs on a shared URL.");
    if (domains.sslExpired > 0) push("critical", `${domains.sslExpired} domain certificate(s) have expired.`);
    if (domains.total > 0 && domains.verified < domains.total) push("attention", `${domains.total - domains.verified} domain(s) are not DNS-verified yet.`);
    if (domains.total > 0 && domains.verified === domains.total && domains.sslExpired === 0) push("good", `All ${domains.verified} domain(s) are verified with valid SSL.`);

    if (suspendedMemberships > 0) push("attention", `${suspendedMemberships} suspended membership(s) should be reviewed or removed.`);
    else push("good", "No suspended staff memberships.");

    if (expiredStillActive > 0) push("critical", `${expiredStillActive} expired API key(s) are still flagged active  rotate or revoke them.`);

    const status = hasCritical ? "critical" : hasAttention ? "attention" : "good";

    res.json({
      status,
      reasons,
      sections: {
        authentication: {
          ownerTwoFactor: Boolean(owner?.twoFactorEnabled),
          staffWith2FA,
          staffTotal,
          failedLogins30d,
        },
        access: {
          activeAdmins: staffTotal,
          suspendedMemberships,
          roles,
        },
        infrastructure: {
          domains,
          apiKeys,
          webhooks,
        },
      },
      recentEvents: securityEvents.map((event) => ({
        _id: event._id,
        createdAt: event.createdAt,
        action: event.action,
        summary: event.summary,
        severity: event.severity,
        actorNameSnapshot: event.actorNameSnapshot || event.actorType,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET maintenance data for a store
router.get("/:id/maintenance", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).select("maintenance name").lean();
    if (!store) return res.status(404).json({ message: "Store not found" });
    const maintenance = store.maintenance || {};
    res.json({
      enabled: Boolean(maintenance.enabled),
      message: maintenance.message || "",
      updatedAt: maintenance.updatedAt || null,
      updatedBy: maintenance.updatedBy || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE store-scoped maintenance mode (platform ops are NOT handled here)
router.put(
  "/:id/maintenance",
  loadUser, resolveAuthorizationContext, requireStoreAccess(),
  hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]),
  async (req, res) => {
    try {
      const { enabled, message } = req.body || {};
      const updated = await Store.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            "maintenance.enabled": Boolean(enabled),
            "maintenance.message": String(message ?? "").slice(0, 500),
            "maintenance.updatedAt": new Date(),
            "maintenance.updatedBy": req.userId,
          },
        },
        { new: true }
      ).select("name maintenance");
      if (!updated) return res.status(404).json({ message: "Store not found" });

      AuditService.logAction({
        actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
        actorId: req.userId,
        module: "store",
        action: enabled ? "maintenance.enabled" : "maintenance.disabled",
        summary: `Maintenance mode ${enabled ? "enabled" : "disabled"} for store "${updated.name}"`,
        entityType: "store",
        entityId: updated._id,
        storeId: updated._id,
        severity: enabled ? "high" : "low",
        requestId: req.requestId,
      }).catch(() => {});

      res.json({ enabled: updated.maintenance?.enabled || false, message: updated.maintenance?.message || "", updatedAt: updated.maintenance?.updatedAt || null });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);


// GET one store
router.get("/:id", loadUser, resolveAuthorizationContext, requireStoreAccess(), async (req, res) => {
  try {
    const data = await storeService.getAdminStoreDetails(req.params.id);
    res.json(data);
  } catch (err) {
    if (err.code === "BAD_REQUEST") return res.status(400).json({ message: err.message });
    if (err.code === "NOT_FOUND") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// CREATE store
//
// Atomic (transactional):
//   Store + Subscription + UserStore + User.currentStoreId + isSelected invariant
// Best-effort (after commit):
//   Roles, settings, theme, pages, shipping zone, provisioning status, events, email
// Permission: platform.store.create is verified inside storeService.createStore().
router.post("/", loadUser, resolveAuthorizationContext, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Store name is required" });
    }

    // SO-04: single entry point. This route used to build the Store, its
    // owner, roles, and every provisioning step inline  non-transactional,
    // and broken outright (ownerEmail/ownerFirstName/etc. were referenced
    // without ever being destructured from req.body, so every call here
    // threw a ReferenceError). storeService.createStore already does all of
    // this properly (atomic Store+Subscription+UserStore transaction, a
    // real store-scope owner role, quota/subdomain checks, trialEndsAt
    // computed server-side, best-effort provisioning)  this route's only
    // job now is to call it and translate its errors.
    const { store: saved } = await storeService.createStore({
      userId: req.userId,
      payload: req.body,
    });

    AuditService.logAction({
      actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      actorId: req.userId,
      module: "store",
      action: "create",
      summary: `Store "${saved.name}" created`,
      entityType: "store",
      entityId: saved._id,
      storeId: saved._id,
      newValue: { name: saved.name, category: saved.category },
      requestId: req.requestId,
      ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress,
      userAgent: req.headers["user-agent"],
    }).catch(() => {});

    res.json(saved);
  } catch (err) {
    if (err.code === "FORBIDDEN") {
      return res.status(403).json({ message: err.message });
    }
    if (err.code === "RATE_LIMITED") {
      return res.status(429).json({ message: err.message });
    }
    if (err.message && err.message.includes("already taken")) {
      return res.status(409).json({ message: err.message });
    }
    if (err.message && err.message.includes("Subdomain format is invalid")) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message && err.message.includes("quota")) {
      return res.status(409).json({ message: err.message });
    }
    logger.error(`storeRoute POST /: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// DUPLICATE store
router.post(
  "/:id/duplicate",
  loadUser, resolveAuthorizationContext, requireStoreAccess(),
  hasAnyPermission(["online store", "create"], ["stores", "create"]),
  async (req, res) => {
  try {
    const original = await Store.findById(req.params.id);
    if (!original) return res.status(404).json({ message: "Store not found" });

    // Build a unique name for the duplicate: "Original - Copy" or add (n)
    const baseName = `${original.name} - Copy`;
    let name = baseName;
    let counter = 1;

    // Ensure uniqueness (case-insensitive)
    while (await Store.findOne({ name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } })) {
      counter += 1;
      name = `${baseName} (${counter})`;
    }

    // SO-04.10: same single entry point as store creation  this used to
    // clone the raw Store document directly (`new Store(obj)`), which
    // skipped the entire transactional pipeline: no Subscription, no
    // store-owner Role, no UserStore link at all for the duplicate.
    // Deliberately NOT copying slug/subdomain/customDomain (unique per
    // store  createStore would reject them as already-taken) or
    // ownerId/subscription/provisioning fields (createStore computes those
    // fresh); the requesting user becomes the new store's owner, same as a
    // brand-new store.
    const { store: saved } = await storeService.createStore({
      userId: req.userId,
      payload: {
        name,
        category: original.category,
        address: original.address,
        logo: original.logo,
        reviewSettings: original.reviewSettings,
        billingCycle: original.billingCycle,
        themeId: original.themeId,
      },
    });

    res.json(saved);
  } catch (err) {
    if (err.code === "FORBIDDEN") return res.status(403).json({ message: err.message });
    if (err.code === "RATE_LIMITED") return res.status(429).json({ message: err.message });
    if (err.message && err.message.includes("quota")) {
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

// UPDATE store  avec vérification d'unicité du nom (sauf lui-même)
router.put("/:id", loadUser, resolveAuthorizationContext, requireStoreAccess(), async (req, res) => {
  try {
    const allowedFields = ["name", "address", "category", "logo", "reviewSettings", "billingCycle", "subdomain", "domain", "customDomain"];
    const storePayload = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        storePayload[field] = req.body[field];
      }
    }

    if (storePayload.name && String(storePayload.name).trim()) {
      const existing = await Store.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${escapeRegex(String(storePayload.name).trim())}$`, "i") },
      });

      if (existing) {
        return res.status(400).json({
          message: `A store named "${storePayload.name}" already exists. Please choose a different name.`,
        });
      }
    }

    if (Object.prototype.hasOwnProperty.call(storePayload, "category")) {
      storePayload.category = String(storePayload.category || "").trim() || undefined;
    }

    const updated = await Store.findByIdAndUpdate(req.params.id, storePayload, { new: true });

    emitEvent("store.updated", {
      storeId: updated._id,
      actorId: req.userId,
      entityId: updated._id,
      metadata: { storeName: updated.name },
      actionUrl: `/stores/${updated._id}`,
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SO-05  DELETE/RESTORE store, Option B: a store owner may soft-delete
// (and restore) ONLY their own store, without needing to be a platform
// admin; anyone else needs the platform-level route
// (platform.store.delete/.restore, see platformStoreRoutes.js) instead.
// Reuses PlatformStoreService's soft-delete implementation (deletedAt/
// deletedBy/status, audit log, event) rather than a second copy of it 
// only the actor/permission story differs here.
//
// Deliberately NOT using requireStoreAccess() here: since SO-02, it
// rejects any already-deleted store outright (hasStoreAccess checks
// !store.deletedAt)  correct for every other store route, but backwards
// for /restore, whose entire job is to act on a store that IS deleted.
// requireOwnerOrSuperAdmin does its own fetch + ownership check instead;
// resolveAuthorizationContext (already applied) still resolves this store's
// permissions via its own UserStore lookup (which never filters on the
// Store's own deletedAt), so hasAnyPermission below still works normally.
const requireOwnerOrSuperAdmin = (options = {}) => async (req, res, next) => {
  const { allowDeleted = false } = options;
  const store = await Store.findById(req.params.id).select("ownerId deletedAt");
  if (!store || (store.deletedAt && !allowDeleted)) {
    return res.status(404).json({ message: "Store not found" });
  }

  const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
  const isOwner = store.ownerId && String(store.ownerId) === String(req.userId);
  if (!isSuperAdmin && !isOwner) {
    return res.status(403).json({ message: "Only this store's owner can perform this action." });
  }

  next();
};

router.delete(
  "/:id",
  loadUser, resolveAuthorizationContext,
  requireOwnerOrSuperAdmin(),
  async (req, res) => {
    try {
      const { reason } = req.body || {};
      const result = await PlatformStoreService.softDeleteStore(req.params.id, {
        reason,
        actorId: req.userId,
        actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      });
      res.status(200).json({ message: "Store deleted", data: result });
    } catch (err) {
      if (err.code === "BAD_REQUEST") return res.status(400).json({ message: err.message });
      if (err.code === "NOT_FOUND") return res.status(404).json({ message: err.message });
      res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  "/:id/restore",
  loadUser, resolveAuthorizationContext,
  requireOwnerOrSuperAdmin({ allowDeleted: true }),
  async (req, res) => {
    try {
      const { reason } = req.body || {};
      const result = await PlatformStoreService.restoreStore(req.params.id, {
        reason,
        actorId: req.userId,
        actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      });
      res.status(200).json({ message: "Store restored", data: result });
    } catch (err) {
      if (err.code === "BAD_REQUEST") return res.status(400).json({ message: err.message });
      if (err.code === "NOT_FOUND") return res.status(404).json({ message: err.message });
      if (err.code === "CONFLICT") return res.status(409).json({ message: err.message });
      res.status(500).json({ message: err.message });
    }
  }
);

// UPDATE store settings (per-store settings configuration)
// Strict whitelist  an API must never copy req.body straight into the model
// (mass assignment would expose status/plan/subscription/owner fields).
const validateReviewSettingsInput = (input) => {
  const review = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return review;
  for (const key of ["enabled", "requireApproval", "verifiedOwnersOnly", "allowGuestReviews", "showRating", "showCount"]) {
    if (typeof input[key] === "boolean") review[key] = input[key];
  }
  if (input.maxImages !== undefined) {
    const maxImages = Number(input.maxImages);
    if (Number.isFinite(maxImages) && maxImages >= 0) review.maxImages = Math.floor(maxImages);
  }
  return review;
};

const SETTINGS_GROUP_BUILDERS = {
  general: (body = {}) => {
    const payload = {};
    if (typeof body.name === "string" && body.name.trim()) payload.name = body.name.trim().slice(0, 200);
    if (typeof body.address === "string") payload.address = body.address.trim().slice(0, 500);
    if (typeof body.logo === "string") payload.logo = body.logo.trim();
    if (typeof body.category === "string") payload.category = body.category.trim();
    return payload;
  },
  reviews: (body = {}) => {
    const payload = {};
    const review = validateReviewSettingsInput(body.reviewSettings);
    if (Object.keys(review).length > 0) payload.reviewSettings = review;
    return payload;
  },
};

const SETTINGS_ALLOWED_GROUPS = Object.keys(SETTINGS_GROUP_BUILDERS);

const buildSettingsPayload = (body = {}) => {
  const combined = { ...SETTINGS_GROUP_BUILDERS.general(body), ...SETTINGS_GROUP_BUILDERS.reviews(body) };
  return combined;
};

router.put(
  "/:id/settings/:group",
  loadUser, resolveAuthorizationContext, requireStoreAccess(),
  hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]),
  async (req, res) => {
    try {
      const builder = SETTINGS_GROUP_BUILDERS[req.params.group];
      if (!builder) {
        return res.status(404).json({ message: `Unknown settings group '${req.params.group}'. Available: ${SETTINGS_ALLOWED_GROUPS.join(", ")}` });
      }
      const store = await Store.findById(req.params.id);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const storePayload = builder(req.body || {});
      if (Object.keys(storePayload).length === 0) {
        return res.status(400).json({ message: `No valid '${req.params.group}' settings provided` });
      }

      const updated = await Store.findByIdAndUpdate(req.params.id, storePayload, { new: true, runValidators: true });

      AuditService.logAction({
        actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
        actorId: req.userId,
        module: "store",
        action: `settings.${req.params.group}`,
        summary: `Settings group "${req.params.group}" updated for store "${updated.name}"`,
        entityType: "store",
        entityId: updated._id,
        storeId: updated._id,
        severity: req.params.group === "reviews" ? "low" : "medium",
        changes: Object.keys(storePayload),
        requestId: req.requestId,
      }).catch(() => {});

      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

router.put(
  "/:id/settings",
  loadUser, resolveAuthorizationContext, requireStoreAccess(),
  hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]),
  async (req, res) => {
    try {
      const store = await Store.findById(req.params.id);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const storePayload = buildSettingsPayload(req.body);
      if (Object.keys(storePayload).length === 0) {
        return res.status(400).json({
          message: `No valid settings provided. Allowed groups: ${SETTINGS_ALLOWED_GROUPS.join(", ")}`,
        });
      }

      const updated = await Store.findByIdAndUpdate(
        req.params.id,
        storePayload,
        { new: true, runValidators: true }
      );

      AuditService.logAction({
        actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
        actorId: req.userId,
        module: "store",
        action: "settings.updated",
        summary: `Settings updated for store "${updated.name}"`,
        entityType: "store",
        entityId: updated._id,
        storeId: updated._id,
        severity: "medium",
        changes: Object.keys(storePayload),
        requestId: req.requestId,
      }).catch(() => {});

      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// UPDATE store active status (archive/unarchive)
router.put(
  "/:id/status",
  loadUser, resolveAuthorizationContext, requireStoreAccess(),
  hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]),
  async (req, res) => {
    try {
      const { isActive } = req.body;
      const status = isActive ? "active" : "suspended";
      const updated = await Store.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: "Store not found" });
      }

      emitEvent(isActive ? "store.activated" : "store.suspended", {
        storeId: updated._id,
        actorId: req.userId,
        entityId: updated._id,
        metadata: { storeName: updated.name },
        actionUrl: `/stores/${updated._id}`,
      });

      AuditService.logAction({
        actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
        actorId: req.userId,
        module: "store",
        action: isActive ? "activate" : "suspend",
        summary: `Store "${updated.name}" ${isActive ? "activated" : "suspended"}`,
        entityType: "store",
        entityId: updated._id,
        storeId: updated._id,
        severity: isActive ? "low" : "high",
        requestId: req.requestId,
      }).catch(() => {});

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// SO-19: DELETE "/:id" and POST "/:id/restore" used to be defined TWICE in
// this file  this second copy (pre-dating SO-05's requireOwnerOrSuperAdmin
// version above) duplicated the soft-delete/restore logic inline instead of
// reusing PlatformStoreService, and gated on "Platform Store.delete" (a
// platform-scope permission a normal store owner never holds). Express
// always matches the first router.delete("/:id", ...)/router.post("/:id/
// restore", ...) registered on this router  the SO-05 versions above  so
// this block was already 100% dead code, never reached. Removed rather than
// left as confusing, unreachable duplicate logic.

// NOTE: route POST "/:id/select" removed  selecting active store
// should be handled client-side via user preferences or replaced by
// a dedicated user endpoint. Removed to avoid selecting stores from
// the public store detail page.

// --- Update a domain scoped to a store (matches frontend /stores/:id/domains/:domainId) ---
router.put(
  "/:id/domains/:domainId",
  loadUser, resolveAuthorizationContext, requireStoreAccess(),
  hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]),
  async (req, res) => {
  try {
    // Only domain/isPrimary are client-settable. verified/ssl/dns*/ssl* are
    // derived exclusively by DomainVerificationService.
    const { domain, isPrimary } = req.body;
    const id = req.params.domainId;
    const storeId = req.params.id;

    const existingDoc = await StoreDomain.findById(id);
    if (!existingDoc) return res.status(404).json({ message: "Domain not found" });

    // Ensure domain belongs to the scoped store
    if (existingDoc.storeId && existingDoc.storeId.toString() !== storeId) {
      return res.status(403).json({ message: "Domain does not belong to this store" });
    }

    if (domain && domain.trim()) {
      if (!isValidDomain(domain)) {
        return res.status(400).json({ message: "Domain format is invalid" });
      }

      try {
        DomainVerificationService.assertDomainEligible(domain);
      } catch (eligibilityError) {
        return res.status(400).json({ message: eligibilityError.message });
      }

      const conflict = await StoreDomain.findOne({
        _id: { $ne: id },
        domain: { $regex: new RegExp(`^${escapeRegex(domain.trim())}$`, "i") },
      });
      if (conflict) return res.status(400).json({ message: `Domain '${domain}' already exists` });
    }

    if (isPrimary) {
      await StoreDomain.updateMany({ storeId }, { $set: { isPrimary: false } });
    }

    const updates = {};
    if (domain) updates.domain = domain.trim().toLowerCase();
    if (typeof isPrimary !== "undefined") updates.isPrimary = !!isPrimary;

    // If the hostname changed, previous DNS/SSL results are stale.
    const updated = await StoreDomain.findByIdAndUpdate(
      id,
      { ...updates, ...(updates.domain ? { dnsStatus: "pending", sslStatus: "pending", verified: false, ssl: false, resolvedIps: [], lastError: null } : {}) },
      { new: true }
    );

    if (updates.domain) {
      DomainVerificationService.verifyStoreDomainDocument(updated).catch((err) => {
        console.error("Background domain verification failed:", err.message);
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Delete a domain scoped to a store (matches frontend /stores/:id/domains/:domainId) ---
router.delete(
  "/:id/domains/:domainId",
  loadUser, resolveAuthorizationContext, requireStoreAccess(),
  hasAnyPermission(["online store", "delete"], ["store", "delete"], ["stores", "delete"]),
  async (req, res) => {
  try {
    const existing = await StoreDomain.findById(req.params.domainId);
    if (!existing) return res.status(404).json({ message: "Domain not found" });

    if (existing.storeId && existing.storeId.toString() !== req.params.id) {
      return res.status(403).json({ message: "Domain does not belong to this store" });
    }

    await StoreDomain.findByIdAndDelete(req.params.domainId);
    try {
      if (existing.storeId) {
        await StoreUsageService.decrementUsage(existing.storeId, "domains", 1);
      }
    } catch (err) {
      console.error("Failed to decrement domain usage for store:", err.message);
    }
    res.json({ message: "Domain deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Store detail action endpoints ---

// Change store owner
router.put("/:id/owner", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    const { ownerId } = req.body;
    if (!ownerId) {
      return res.status(400).json({ message: "ownerId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return res.status(400).json({ message: "Invalid ownerId" });
    }

    const owner = await User.findById(ownerId).lean();
    if (!owner) {
      return res.status(404).json({ message: "Owner user not found" });
    }

    const updated = await Store.findByIdAndUpdate(req.params.id, { ownerId }, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Store not found" });
    }

    // SO-11: Store.ownerId and this person's UserStore must agree  an owner
    // with no active, store-owner-scoped UserStore would pass `isOwner`
    // checks (SO-05) yet fail every permission check (SO-16/SO-17), since
    // permissions are resolved off UserStore.roleId, never Store.ownerId.
    const storeOwnerRole = await Role.findOne({
      storeId: updated._id,
      scope: "store",
      slug: "store-owner",
    }).lean();
    if (!storeOwnerRole) {
      return res.status(500).json({
        message: `Store-scope "store-owner" role not found for store ${updated._id}  cannot assign ownership.`,
      });
    }

    const existingMembership = await UserStore.findOne({ userId: ownerId, storeId: req.params.id });
    if (!existingMembership) {
      await UserStore.create({
        userId: ownerId,
        storeId: req.params.id,
        roleId: storeOwnerRole._id,
        status: "active",
      });
    } else {
      existingMembership.roleId = storeOwnerRole._id;
      existingMembership.status = "active";
      await existingMembership.save();
    }

    await AuditService.logAction({
      actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      actorId: req.userId,
      module: "store",
      action: "change_owner",
      summary: `Store "${updated.name}" owner changed to ${owner.email}`,
      entityType: "store",
      entityId: updated._id,
      storeId: updated._id,
      severity: "high",
      requestId: req.requestId,
      ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress,
      userAgent: req.headers["user-agent"],
    }).catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export store logs
router.get("/:id/logs/export", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const filter = buildAuditQuery(req.params.id, req.query);
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

    const cell = (value) => `"${String(value ?? "").replace(/"/g, '""').slice(0, 500)}"`;
    const csv = [
      "timestamp,actor_type,actor_name,module,action,entity_type,entity_id,severity,status,ip,request_id,summary",
      ...logs.map((log) =>
        [
          log.createdAt ? new Date(log.createdAt).toISOString() : "",
          log.actorType || "",
          log.actorNameSnapshot || "",
          log.module || "",
          log.action || "",
          log.entityType || "",
          log.entityId || "",
          log.severity || "",
          log.status || "",
          log.ip || log.sourceIp || log.ipAddress || "",
          log.requestId || "",
          log.summary || "",
        ]
          .map(cell)
          .join(",")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="store-${req.params.id}-audit.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET technical logs for a store (Logs ` Audit  machine events only)
// Sources actually persisted today: outbound webhook deliveries, backup jobs,
// export jobs and auth-related audit entries. API/System request logs require
// request instrumentation that is not built yet.
router.get("/:id/system-logs", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const storeId = req.params.id;
    const service = ["all", "webhooks", "jobs", "auth"].includes(req.query.service) ? req.query.service : "all";
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 60));

    const entries = [];
    const levelFrom = (status) =>
      ["failed", "error"].includes(status) ? "error" : ["retrying", "pending", "processing", "queued"].includes(status) ? "warn" : "info";

    const tasks = [];

    if (service === "all" || service === "webhooks") {
      tasks.push(
        WebhookLog.find({ storeId }).sort({ createdAt: -1 }).limit(limit).lean().then((rows) => {
          for (const row of rows) {
            entries.push({
              _id: `whl-${row._id}`,
              ts: row.createdAt,
              level: levelFrom(row.status),
              service: `webhook:${row.provider}`,
              message: `${row.direction || "outbound"} ${row.event}${row.httpStatus ? ` -> HTTP ${row.httpStatus}` : ""}${row.durationMs ? ` (${row.durationMs}ms)` : ""}`,
              requestId: row.requestId || null,
              meta: row.errorMessage || null,
            });
          }
        })
      );
    }

    if (service === "all" || service === "jobs") {
      tasks.push(
        BackupJob.find({ storeId }).sort({ createdAt: -1 }).limit(Math.ceil(limit / 2)).lean().then((rows) => {
          for (const row of rows) {
            entries.push({
              _id: `bkj-${row._id}`,
              ts: row.createdAt,
              level: levelFrom(row.status),
              service: "job:backup",
              message: `Manual/scheduled backup ${row.type} -> ${row.status}${row.progress !== undefined && row.status === "running" ? ` (${row.progress}%)` : ""}`,
              requestId: null,
              meta: row.error || null,
            });
          }
        }),
        ExportJob.find({ "filters.storeId": new mongoose.Types.ObjectId(storeId) })
          .sort({ createdAt: -1 })
          .limit(Math.ceil(limit / 2))
          .lean()
          .then((rows) => {
            for (const row of rows) {
              entries.push({
                _id: `exj-${row._id}`,
                ts: row.createdAt,
                level: levelFrom(row.status),
                service: "job:export",
                message: `${row.source || "audit"} export (${row.format || "csv"}) -> ${row.status}`,
                requestId: null,
                meta: null,
              });
            }
          })
      );
    }

    if (service === "all" || service === "auth") {
      tasks.push(
        AuditLog.find({ storeId, module: "auth" }).sort({ createdAt: -1 }).limit(limit).lean().then((rows) => {
          for (const row of rows) {
            entries.push({
              _id: `aut-${row._id}`,
              ts: row.createdAt,
              level: row.status === "failed" ? "error" : "info",
              service: "auth",
              message: `${row.action}: ${row.summary}`,
              requestId: row.requestId || null,
              meta: null,
            });
          }
        })
      );
    }

    await Promise.all(tasks);

    entries.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    res.json({ logs: entries.slice(0, limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET roles assignable to staff on this store (used by the Add admin form)
router.get("/:id/roles", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const roles = await roleService.getRolesByStore(req.params.id);
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add admin to store
// SO-06: single flow for adding staff (CAS A: new email / CAS B: existing
// email, checked in a strict order)  see userService.addStaffToStore for
// the actual logic. This route's only job is param validation, permission
// (already enforced above), usage counting, and translating the outcome/
// error into an HTTP response.
router.post("/:id/admins", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "create"], ["store", "create"], ["stores", "create"]), async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ message: "email and role are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(role)) {
      return res.status(400).json({ message: "Invalid role id" });
    }
    const resolvedRole = await roleService.getRoleByIdForStore(role, req.params.id);
    if (!resolvedRole) {
      return res.status(400).json({ message: "Role does not belong to this store" });
    }

    // SO-15: staff was the one limited resource with no quota check at all 
    // StoreUsageService.incrementUsage below only counts what already
    // happened, it was never gated on the plan's actual "admins" limit.
    const quotaCheck = await SoftLimitService.checkQuotaAvailable(req.params.id, "admins", 1);
    if (!quotaCheck.allowed) {
      return res.status(409).json({
        message: `Quota de membres du personnel atteint pour cette boutique (${quotaCheck.used}/${quotaCheck.limit})`,
        code: "QUOTA_EXCEEDED",
      });
    }

    const result = await userService.addStaffToStore({
      email,
      name,
      phone,
      roleId: resolvedRole._id,
      storeId: req.params.id,
    });

    await StoreUsageService.incrementUsage(req.params.id, "admins", 1);

    AuditService.logAction({
      actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      actorId: req.userId,
      module: "store",
      action: `admin_${result.outcome}`,
      summary: `"${result.user.email}" ${result.outcome} as staff on store`,
      entityType: "user",
      entityId: result.user._id,
      storeId: req.params.id,
    });

    const messageByOutcome = {
      created: result.emailSent
        ? "Admin added successfully. The password has been sent by email."
        : "Admin added, but the welcome email could not be sent.",
      attached: result.emailSent
        ? "Existing user added as staff on this store. An invitation email was sent."
        : "Existing user added as staff on this store, but the invitation email could not be sent.",
      reactivated: result.emailSent
        ? "This user's access to the store was reactivated with the new role."
        : "This user's access to the store was reactivated, but the notification email could not be sent.",
    };

    res.status(result.outcome === "created" ? 201 : 200).json({
      message: messageByOutcome[result.outcome],
      emailSent: result.emailSent,
      data: {
        _id: result.user._id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role,
        status: result.user.status,
        createdAt: result.user.createdAt,
      },
    });
  } catch (err) {
    if (["AccountDeleted", "AccountSuspended", "AlreadyMember", "InvitationPending"].includes(err.name)) {
      return res.status(409).json({ message: err.message });
    }
    if (["ValidationError", "InvalidTarget"].includes(err.name)) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

// Update staff role for a store
router.put("/:storeId/staff/:userId/role", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    const { storeId, userId } = req.params;
    const { roleId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({ message: "Valid roleId is required" });
    }

    // Store-scope role belonging to THIS store only  never a platform
    // role, per the golden rule (a Store Admin must never be able to
    // assign platform/Super Admin access through a store-scope action).
    // The old `$or` here also matched a platform-scope role slugged
    // "store-owner", which no longer exists (store-owner has always been
    // store-scope in this codebase)  dead code, removed.
    const role = await Role.findOne({ _id: roleId, storeId, scope: "store" });
    if (!role) {
      return res.status(400).json({ message: "Role does not belong to this store" });
    }

    const membership = await UserStore.findOneAndUpdate(
      { userId, storeId },
      { roleId: role._id },
      { new: true }
    );

    if (!membership) {
      return res.status(404).json({ message: "Staff member not found in this store" });
    }

    res.json({ message: "Role updated successfully", data: membership });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update staff status for a store
router.patch("/:id/staff/:userId/status", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    // SECURITY FIX: this route's param is :id, not :storeId  destructuring
    // req.params.storeId silently produced `undefined`, which Mongoose/the
    // Mongo driver drops from the query entirely. The update below then
    // matched this userId's FIRST UserStore document on ANY store, not the
    // one for the store in the URL  a staff admin of Store A could
    // suspend/reactivate a membership belonging to Store B just by knowing
    // the target's userId. requireStoreAccess() only validated the caller's
    // own access to Store A; it never scoped this specific write.
    const { id: storeId, userId } = req.params;
    const { status } = req.body;

    if (!["active", "invited", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid staff status" });
    }

    const membership = await UserStore.findOneAndUpdate(
      { userId, storeId },
      { status },
      { new: true }
    );

    if (!membership) {
      return res.status(404).json({ message: "Staff member not found in this store" });
    }

    res.json({ message: "Staff status updated successfully", data: membership });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove staff from a store
router.delete("/:id/staff/:userId", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "delete"], ["store", "delete"], ["stores", "delete"]), async (req, res) => {
  try {
    // Same fix as the /status route above  this route's param is :id.
    const { id: storeId, userId } = req.params;

    const membership = await UserStore.findOneAndDelete({
      userId,
      storeId,
    });

    if (!membership) {
      return res.status(404).json({ message: "Staff member not found in this store" });
    }

    await AuditService.logAction({
      actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      actorId: req.userId,
      module: "store",
      action: "staff.removed",
      entityType: "user_store",
      entityId: membership._id,
      storeId,
      severity: "medium",
      requestId: req.requestId,
      summary: `Staff ${userId} removed from store ${storeId}`,
    }).catch(() => {});

    res.json({ message: "Staff removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Store maintenance ops (clear cache / restart workers / rebuild indexes /
// flush queues) are PLATFORM operations and intentionally not exposed here.

// API keys CRUD
router.post("/:id/api-keys", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "create"], ["store", "create"], ["stores", "create"]), async (req, res) => {
  try {
    const created = await ApiKeyService.create(req.params.id, req.body, req.userId);
    // `secret` is returned exactly once, here.
    res.status(201).json(created);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/api-keys/:keyId/regenerate", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    const rotated = await ApiKeyService.rotate(req.params.id, req.params.keyId, req.userId);
    // New secret shown exactly once.
    res.json(rotated);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/api-keys/:keyId/revoke", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "delete"], ["store", "delete"], ["stores", "delete"]), async (req, res) => {
  try {
    const revoked = await ApiKeyService.revoke(req.params.id, req.params.keyId, req.userId);
    res.json(revoked);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id/api-keys/:keyId/expiry", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    const { expiresAt } = req.body || {};
    const updated = await ApiKeyService.setExpiry(req.params.id, req.params.keyId, expiresAt || null, req.userId);
    res.json(updated);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// Webhooks CRUD
router.post("/:id/webhooks", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "create"], ["store", "create"], ["stores", "create"]), async (req, res) => {
  try {
    const created = await StoreWebhookService.create(req.params.id, req.body, req.userId);
    // Signing secret shown exactly once, here.
    res.status(201).json(created);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id/webhooks/:webhookId/deliveries", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "view"], ["store", "view"], ["stores", "view"]), async (req, res) => {
  try {
    const deliveries = await StoreWebhookService.listDeliveries(req.params.id, req.params.webhookId, req.query.limit);
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/webhooks/:webhookId/test", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    const result = await StoreWebhookService.test(req.params.id, req.params.webhookId, req.userId);
    if (!result.ok) return res.status(502).json({ message: "Test delivery failed  check delivery history for details" });
    res.json({ success: true, message: "Test delivered successfully" });
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/webhooks/:webhookId/status", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    const { status } = req.body || {};
    const updated = await StoreWebhookService.setStatus(req.params.id, req.params.webhookId, status);
    res.json(updated);
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/webhooks/:webhookId/rotate-secret", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    const rotated = await StoreWebhookService.rotateSecret(req.params.id, req.params.webhookId, req.userId);
    res.json(rotated);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/webhooks/:webhookId/deliveries/:deliveryId/retry", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "update"], ["store", "update"], ["stores", "update"]), async (req, res) => {
  try {
    const updated = await StoreWebhookService.retry(req.params.id, req.params.webhookId, req.params.deliveryId);
    res.json(updated);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id/webhooks/:webhookId", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasAnyPermission(["online store", "delete"], ["store", "delete"], ["stores", "delete"]), async (req, res) => {
  try {
    const result = await StoreWebhookService.remove(req.params.id, req.params.webhookId);
    res.json(result);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// --- Store Invitations ---
// Real pending -> email -> accept flow (as opposed to addStaffToStore's CAS
// A, which activates immediately with a generated password). Reuses
// InvitationService  same model, same token/expiry handling as platform
// invitations  with storeId always taken from the URL, never the body.
router.get("/:id/invitations", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Staff", "view"), async (req, res) => {
  try {
    const { status, search, page, limit } = req.query;
    const result = await InvitationService.getAllInvitations(
      { status, search, storeId: req.params.id },
      { page, limit }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/invitations", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Staff", "invite"), async (req, res) => {
  try {
    const { email, firstName, lastName, roleId } = req.body;
    if (!email || !roleId) {
      return res.status(400).json({ message: "email and roleId are required" });
    }
    const result = await InvitationService.createInvitation({
      email,
      firstName,
      lastName,
      roleIds: [roleId],
      storeId: req.params.id,
      invitedBy: req.userId,
      ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress,
      userAgent: req.headers["user-agent"],
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.name === "EmailExists" || err.name === "InvitationExists") {
      return res.status(409).json({ message: err.message });
    }
    if (["InvalidRoles", "InvalidScope"].includes(err.name)) {
      return res.status(422).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/invitations/:invId/resend", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Staff", "invite"), async (req, res) => {
  try {
    const result = await InvitationService.resendInvitation(
      req.params.invId,
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress,
      req.headers["user-agent"],
      req.userId,
      req.params.id
    );
    res.json(result);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: "Invitation not found" });
    if (err.name === "InvalidState") return res.status(422).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/invitations/:invId/revoke", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Staff", "invite"), async (req, res) => {
  try {
    await InvitationService.revokeInvitation(req.params.invId, req.userId, req.params.id);
    res.json({ message: "Invitation revoked" });
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: "Invitation not found" });
    res.status(500).json({ message: err.message });
  }
});

// --- Store Teams ---
// Reuses the existing TeamService (already used by the platform-scope team
// routes) instead of a second, parallel implementation  same model, same
// audit events, just exposed at the store scope with storeId enforced from
// authContext and gated by the new store-scope "Team" permission module.
router.get("/:id/teams", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Team", "view"), async (req, res) => {
  try {
    const { search, department, page, limit } = req.query;
    const result = await TeamService.getAllTeams(
      { search, department, storeId: req.params.id },
      { page, limit }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id/teams/:teamId", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Team", "view"), async (req, res) => {
  try {
    const team = await TeamService.getTeamById(req.params.teamId);
    if (!team || String(team.storeId?._id || team.storeId) !== String(req.params.id)) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/teams", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Team", "create"), async (req, res) => {
  try {
    const team = await TeamService.createTeam(
      { ...req.body, storeId: req.params.id },
      req.userId
    );
    res.status(201).json(team);
  } catch (err) {
    if (err.name === "TeamExists") return res.status(409).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/teams/:teamId", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Team", "update"), async (req, res) => {
  try {
    const existing = await TeamService.getTeamById(req.params.teamId);
    if (!existing || String(existing.storeId?._id || existing.storeId) !== String(req.params.id)) {
      return res.status(404).json({ message: "Team not found" });
    }
    // storeId is never accepted from the body  a team can't be moved to a
    // different store through this route.
    const { storeId, ...updates } = req.body;
    const team = await TeamService.updateTeam(req.params.teamId, updates, req.userId);
    res.json(team);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id/teams/:teamId", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Team", "delete"), async (req, res) => {
  try {
    const existing = await TeamService.getTeamById(req.params.teamId);
    if (!existing || String(existing.storeId?._id || existing.storeId) !== String(req.params.id)) {
      return res.status(404).json({ message: "Team not found" });
    }
    const result = await TeamService.deleteTeam(req.params.teamId, req.userId);
    res.json(result);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/teams/:teamId/members", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Team", "members_manage"), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const team = await TeamService.getTeamById(req.params.teamId);
    if (!team || String(team.storeId?._id || team.storeId) !== String(req.params.id)) {
      return res.status(404).json({ message: "Team not found" });
    }
    // The user being added must actually be a member of THIS store  added
    // check on top of TeamService's own (store-agnostic) implementation.
    const membership = await UserStore.findOne({ userId, storeId: req.params.id, status: "active" });
    if (!membership) {
      return res.status(400).json({ message: "This user is not an active member of this store" });
    }

    const user = await TeamService.assignUserToTeam(userId, req.params.teamId, req.userId);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id/teams/:teamId/members/:userId", loadUser, resolveAuthorizationContext, requireStoreAccess(), hasPermission("Team", "members_manage"), async (req, res) => {
  try {
    const team = await TeamService.getTeamById(req.params.teamId);
    if (!team || String(team.storeId?._id || team.storeId) !== String(req.params.id)) {
      return res.status(404).json({ message: "Team not found" });
    }
    const user = await TeamService.removeFromTeam(req.params.userId, req.userId);
    res.json(user);
  } catch (err) {
    if (err.name === "NotFound") return res.status(404).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;


