const User = require("../models/User");
const UserStore = require("../models/UserStore");
const logger = require("../config/logger");
const { eventBus } = require("../lib/eventBus");
const notificationService = require("./notificationService");

const EVENT_CONFIG = {
  "store.created": { entityType: "store", category: "store", scope: "platform", priority: "normal" },
  "store.updated": { entityType: "store", category: "store", scope: "platform", priority: "low" },
  "store.suspended": { entityType: "store", category: "store", scope: "platform", priority: "high" },
  "store.activated": { entityType: "store", category: "store", scope: "platform", priority: "normal" },
  "store.deleted": { entityType: "store", category: "store", scope: "platform", priority: "high" },

  "user.created": { entityType: "user", category: "users", scope: "store", priority: "normal", permission: "Staff.view" },
  "user.invited": { entityType: "user", category: "users", scope: "store", priority: "normal", permission: "Staff.view" },
  "user.updated": { entityType: "user", category: "users", scope: "store", priority: "low", permission: "Staff.view" },
  "user.password_changed": { entityType: "user", category: "security", scope: "user", priority: "high" },

  "order.created": { entityType: "order", category: "orders", scope: "store", priority: "normal", permission: "Orders.view" },
  "order.updated": { entityType: "order", category: "orders", scope: "store", priority: "low", permission: "Orders.view" },
  "order.cancelled": { entityType: "order", category: "orders", scope: "store", priority: "normal", permission: "Orders.view" },
  "order.completed": { entityType: "order", category: "orders", scope: "store", priority: "normal", permission: "Orders.view" },

  "payment.created": { entityType: "payment", category: "payments", scope: "store", priority: "normal", permission: "Payments.view" },
  "payment.paid": { entityType: "payment", category: "payments", scope: "store", priority: "normal", permission: "Payments.view" },
  "payment.failed": { entityType: "payment", category: "payments", scope: "store", priority: "high", permission: "Payments.view" },
  "payment.refunded": { entityType: "payment", category: "payments", scope: "store", priority: "normal", permission: "Payments.view" },

  "subscription.created": { entityType: "subscription", category: "subscriptions", scope: "store", priority: "normal", permission: "Subscriptions.view" },
  "subscription.renewed": { entityType: "subscription", category: "subscriptions", scope: "store", priority: "low", permission: "Subscriptions.view" },
  "subscription.expiring": { entityType: "subscription", category: "subscriptions", scope: "store", priority: "high", permission: "Subscriptions.view" },
  "subscription.expired": { entityType: "subscription", category: "subscriptions", scope: "store", priority: "critical", permission: "Subscriptions.view" },
  "subscription.cancelled": { entityType: "subscription", category: "subscriptions", scope: "store", priority: "high", permission: "Subscriptions.view" },

  "invoice.created": { entityType: "invoice", category: "invoices", scope: "store", priority: "normal", permission: "Invoices.view" },
  "invoice.paid": { entityType: "invoice", category: "invoices", scope: "store", priority: "low", permission: "Invoices.view" },
  "invoice.overdue": { entityType: "invoice", category: "invoices", scope: "store", priority: "high", permission: "Invoices.view" },
  "invoice.reminder": { entityType: "invoice", category: "invoices", scope: "store", priority: "high", permission: "Invoices.view" },

  "product.created": { entityType: "product", category: "inventory", scope: "store", priority: "low", permission: "Products.view" },
  "product.updated": { entityType: "product", category: "inventory", scope: "store", priority: "low", permission: "Products.view" },
  "product.low_stock": { entityType: "product", category: "inventory", scope: "store", priority: "normal", permission: "Products.view" },
  "product.out_of_stock": { entityType: "product", category: "inventory", scope: "store", priority: "high", permission: "Products.view" },

  "customer.created": { entityType: "customer", category: "customers", scope: "store", priority: "low", permission: "Customers.view" },
  "customer.updated": { entityType: "customer", category: "customers", scope: "store", priority: "low", permission: "Customers.view" },

  "review.created": { entityType: "review", category: "reviews", scope: "store", priority: "normal", permission: "Reviews.view" },
  "review.approved": { entityType: "review", category: "reviews", scope: "store", priority: "low", permission: "Reviews.view" },
  "review.rejected": { entityType: "review", category: "reviews", scope: "store", priority: "low", permission: "Reviews.view" },

  "ticket.created": { entityType: "ticket", category: "tickets", scope: "store", priority: "normal", permission: "Support Ticket.view" },
  "ticket.updated": { entityType: "ticket", category: "tickets", scope: "store", priority: "low", permission: "Support Ticket.view" },
  "ticket.assigned": { entityType: "ticket", category: "tickets", scope: "user", priority: "normal" },
  "ticket.agent_replied": { entityType: "ticket", category: "tickets", scope: "user", priority: "normal", recipientModel: "Customer" },
  "ticket.customer_replied": { entityType: "ticket", category: "tickets", scope: "user", priority: "normal" },
  "ticket.status_changed": { entityType: "ticket", category: "tickets", scope: "user", priority: "normal", recipientModel: "Customer" },
  "ticket.sla_warning": { entityType: "ticket", category: "tickets", scope: "user", priority: "high" },
  "ticket.sla_overdue": { entityType: "ticket", category: "tickets", scope: "user", priority: "critical" },

  "wallet.low_balance": { entityType: "wallet", category: "payments", scope: "store", priority: "high", permission: "Payments.view" },
  "promotion.offer": { entityType: "promotion", category: "marketing", scope: "store", priority: "normal", permission: "Coupons.view" },

  "shipment.label_created": { entityType: "shipment", category: "shipping", scope: "store", priority: "normal", permission: "Shipments.view", recipientModel: "Customer" },
  "shipment.picked_up": { entityType: "shipment", category: "shipping", scope: "store", priority: "normal", permission: "Shipments.view", recipientModel: "Customer" },
  "shipment.in_transit": { entityType: "shipment", category: "shipping", scope: "store", priority: "normal", permission: "Shipments.view", recipientModel: "Customer" },
  "shipment.out_for_delivery": { entityType: "shipment", category: "shipping", scope: "store", priority: "normal", permission: "Shipments.view", recipientModel: "Customer" },
  "shipment.delivered": { entityType: "shipment", category: "shipping", scope: "store", priority: "normal", permission: "Shipments.view", recipientModel: "Customer" },
  "shipment.failed_delivery": { entityType: "shipment", category: "shipping", scope: "store", priority: "high", permission: "Shipments.view", recipientModel: "Customer" },
  "shipment.returned": { entityType: "shipment", category: "shipping", scope: "store", priority: "high", permission: "Shipments.view", recipientModel: "Customer" },
  "shipment.cancelled": { entityType: "shipment", category: "shipping", scope: "store", priority: "normal", permission: "Shipments.view" },

  "security.login": { entityType: "security", category: "security", scope: "user", priority: "low" },
  "security.new_login": { entityType: "security", category: "security", scope: "user", priority: "normal" },
  "security.failed_login": { entityType: "security", category: "security", scope: "user", priority: "high" },
  "security.password_changed": { entityType: "security", category: "security", scope: "user", priority: "high" },
  "security.new_device": { entityType: "security", category: "security", scope: "user", priority: "high" },
  "security.alert": { entityType: "security", category: "security", scope: "platform", priority: "critical" },

  "system.error": { entityType: "system", category: "system", scope: "platform", priority: "critical" },
};

const getPlatformRecipients = async () => {
  const users = await User.find({
    deletedAt: null,
    $or: [{ isSuperAdmin: true }, { userType: "platform_admin" }, { userType: "superadmin" }],
  })
    .select("_id")
    .lean();
  return users.map((u) => u._id);
};

const getStoreStaffIds = async (storeId) => {
  const [byArray, byJunction] = await Promise.all([
    User.find({ storeIds: storeId, deletedAt: null }).select("_id").lean(),
    UserStore.find({ storeId }).select("userId").lean(),
  ]);
  const ids = new Set(byArray.map((u) => String(u._id)));
  for (const link of byJunction) ids.add(String(link.userId));
  return [...ids];
};

const getStoreRecipients = async (storeId, config = {}) => {
  if (!storeId) return [];
  const staffIds = await getStoreStaffIds(storeId);
  if (staffIds.length === 0) return [];

  const { permission, roles } = config;

  if (!permission && (!roles || roles.length === 0)) {
    return staffIds;
  }

  const users = await User.find({ _id: { $in: staffIds }, deletedAt: null })
    .select("_id userType isSuperAdmin role")
    .populate({
      path: "role",
      select: "name permissions",
      populate: { path: "permissions", select: "code module action" },
    })
    .lean();

  const roleSet = roles ? new Set(roles.map((r) => r.toLowerCase())) : null;
  const targetPerm = permission ? permission.toLowerCase() : null;

  return users
    .filter((u) => {
      if (u.isSuperAdmin || u.userType === "store_admin" || u.userType === "superadmin" || u.userType === "platform_admin") {
        return true;
      }
      const roleList = Array.isArray(u.role) ? u.role : [u.role];
      if (targetPerm) {
        const hasPermission = roleList.some((r) => {
          const perms = Array.isArray(r?.permissions) ? r.permissions : [];
          return perms.some((p) => {
            const pCode = (p?.code || `${p?.module}.${p?.action}`).toLowerCase();
            return pCode === targetPerm;
          });
        });
        if (hasPermission) return true;
      }
      if (roleSet) {
        const hasRole = roleList.some((r) => roleSet.has(String(r?.name || "").toLowerCase()));
        if (hasRole) return true;
      }
      return false;
    })
    .map((u) => u._id);
};

const resolveRecipients = async (config, payload) => {
  if (Array.isArray(payload.recipients) && payload.recipients.length > 0) {
    return payload.recipients;
  }
  if (config.scope === "platform") return getPlatformRecipients();
  if (config.scope === "store") {
    // For Customer notifications (e.g., shipment events), use the customer ID
    if (config.recipientModel === "Customer" && payload.customerId) {
      return [payload.customerId];
    }
    // For Staff notifications (e.g., regular store notifications), use store staff
    return getStoreRecipients(payload.storeId, config);
  }
  if (config.scope === "user") return payload.userId ? [payload.userId] : [];
  return [];
};

const handleEvent = (eventName, config) => async (payload = {}) => {
  try {
    const recipients = await resolveRecipients(config, payload);

    if (recipients.length === 0) return;

    await notificationService.notify({
      event: eventName,
      storeId: payload.storeId || null,
      actorId: payload.actorId || null,
      entityType: config.entityType,
      entityId: payload.entityId,
      recipients,
      recipientModel: config.recipientModel || "User",
      metadata: payload.metadata || {},
      priority: payload.priority || config.priority,
      actionUrl: payload.actionUrl,
      category: config.category,
      deduplicationKey: payload.deduplicationKey,
      expiresAt: payload.expiresAt || null,
    });
  } catch (err) {
    logger.error(`NotificationEventHandler: failed handling "${eventName}"`, err.message);
  }
};

let registered = false;

const registerHandlers = () => {
  if (registered) return;
  for (const [eventName, config] of Object.entries(EVENT_CONFIG)) {
    eventBus.on(eventName, handleEvent(eventName, config));
  }
  registered = true;
};

module.exports = { registerHandlers, EVENT_CONFIG };
