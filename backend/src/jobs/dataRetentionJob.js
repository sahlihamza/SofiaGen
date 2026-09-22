const Store = require("../models/Store");
const Customer = require("../models/Customer");
const CustomerAddress = require("../models/CustomerAddress");
const Order = require("../models/Order");
const accountsPrivacyService = require("../service/accountsPrivacyService");
const auditLogService = require("../service/auditLogService");
const {
  getRetentionCutoffDate,
  anonymizeCustomerDoc,
  anonymizeOrderDoc,
} = require("../utils/dataRetention");
const logger = require("../config/logger");
const JobLogService = require("../service/JobLogService");

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day
const ORDER_RETENTION_STATUS_MAP = {
  pendingOrders: "Pending",
  cancelledOrders: "Cancel",
  completedOrders: "Delivered",
};


const anonymizeInactiveAccounts = async (store, retention) => {
  const cutoff = getRetentionCutoffDate(retention.inactiveAccounts);
  if (!cutoff) return 0;

  const customers = await Customer.find({
    storeId: store._id,
    deletedAt: null,
    anonymizedAt: null,
    $or: [
      { lastLogin: { $ne: null, $lt: cutoff } },
      { lastLogin: null, createdAt: { $lt: cutoff } },
    ],
  });

  for (const customer of customers) {
    await CustomerAddress.deleteMany({ customerId: customer._id });
    anonymizeCustomerDoc(customer);
    await customer.save({ validateBeforeSave: false });
  }

  return customers.length;
};

// Anonymizes orders whose status/retention window match, for one store.
const anonymizeExpiredOrders = async (store, retention) => {
  const customerIds = await Customer.find({ storeId: store._id }).distinct("_id");
  if (customerIds.length === 0) return 0;

  let anonymizedCount = 0;

  for (const [settingsKey, status] of Object.entries(ORDER_RETENTION_STATUS_MAP)) {
    const cutoff = getRetentionCutoffDate(retention[settingsKey]);
    if (!cutoff) continue;

    const orders = await Order.find({
      user: { $in: customerIds },
      status,
      updatedAt: { $lt: cutoff },
      anonymizedAt: null,
    });

    for (const order of orders) {
      anonymizeOrderDoc(order);
      await order.save({ validateBeforeSave: false });
      anonymizedCount += 1;
    }
  }

  return anonymizedCount;
};

const runDataRetentionForStore = async (store) => {
  const settings = await accountsPrivacyService.getByStoreId(store._id);
  const retention = settings.dataRetention?.toObject?.() || settings.dataRetention || {};

  const customersAnonymized = await anonymizeInactiveAccounts(store, retention);
  const ordersAnonymized = await anonymizeExpiredOrders(store, retention);

  if (customersAnonymized > 0 || ordersAnonymized > 0) {

    await auditLogService.log({
      storeId: store._id,
      action: "data_anonymized",
      entityType: "DataRetentionJob",
      summary: `Rétention automatique : ${customersAnonymized} compte(s) et ${ordersAnonymized} commande(s) anonymisés`,
      metadata: { customersAnonymized, ordersAnonymized },
      actor: null,
    });
  }

  return { customersAnonymized, ordersAnonymized };
};


const runDataRetention = async () => {
  const stores = await Store.find({});
  const totals = { storesProcessed: 0, customersAnonymized: 0, ordersAnonymized: 0 };

  for (const store of stores) {
    const result = await runDataRetentionForStore(store);
    totals.storesProcessed += 1;
    totals.customersAnonymized += result.customersAnonymized;
    totals.ordersAnonymized += result.ordersAnonymized;
  }

  logger.info(
    `dataRetentionJob: processed ${totals.storesProcessed} store(s), anonymized ${totals.customersAnonymized} customer(s) and ${totals.ordersAnonymized} order(s).`
  );

  return totals;
};

const startDataRetentionJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (process.env.ENABLE_DATA_RETENTION_JOB !== "true") {
    logger.info(
      "dataRetentionJob: disabled (set ENABLE_DATA_RETENTION_JOB=true in .env to enable)."
    );
    return null;
  }

  const runSafely = () => {
    JobLogService.runJob("dataRetentionJob", runDataRetention).catch((err) =>
      logger.error("dataRetentionJob failed:", err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = {
  runDataRetention,
  startDataRetentionJob,
  ORDER_RETENTION_STATUS_MAP,
};
