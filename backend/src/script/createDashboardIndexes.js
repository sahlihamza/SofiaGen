/**
 * createDashboardIndexes.js
 *
 * Applies the MongoDB indexes recommended for the Super Admin dashboard
 * (docs/superadmin-dashboard/mongodb-collections.md).
 *
 * These indexes accelerate the aggregation pipelines used by
 * PlatformDashboardV2Service (revenue, stores, subscriptions, payments,
 * financial, usage, alerts, risk, top stores).
 *
 * Idempotent: `createIndex` is a no-op if the index already exists.
 *
 * Usage:
 *   node src/script/createDashboardIndexes.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");

const logger = {
  info: (m) => console.log(`[indexes] ${m}`),
  error: (m) => console.error(`[indexes][error] ${m}`),
};

const INDEXES = {
  stores: [
    { key: { status: 1, deletedAt: 1 }, name: "store_status_deleted" },
    { key: { createdAt: -1 }, name: "store_createdAt" },
    { key: { planId: 1 }, name: "store_planId" },
    { key: { country: 1 }, name: "store_country" },
    { key: { subscriptionStatus: 1 }, name: "store_subscriptionStatus" },
  ],
  invoices: [
    { key: { status: 1 }, name: "invoice_status" },
    { key: { storeId: 1, status: 1 }, name: "invoice_store_status" },
    { key: { createdAt: -1 }, name: "invoice_createdAt" },
    { key: { paidAt: -1 }, name: "invoice_paidAt" },
    { key: { planId: 1 }, name: "invoice_planId" },
  ],
  payments: [
    { key: { status: 1 }, name: "payment_status" },
    { key: { storeId: 1 }, name: "payment_storeId" },
    { key: { createdAt: -1 }, name: "payment_createdAt" },
    { key: { gateway: 1 }, name: "payment_gateway" },
    { key: { currency: 1 }, name: "payment_currency" },
  ],
  subscriptions: [
    { key: { status: 1 }, name: "subscription_status" },
    { key: { storeId: 1 }, name: "subscription_storeId" },
    { key: { planId: 1 }, name: "subscription_planId" },
    { key: { currentPeriodEnd: 1 }, name: "subscription_periodEnd" },
    { key: { createdAt: -1 }, name: "subscription_createdAt" },
  ],
  subscriptionEvents: [
    { key: { type: 1, createdAt: -1 }, name: "subscriptionevent_type_createdAt" },
  ],
  storesUsage: [
    { key: { storeId: 1 }, name: "storeusage_storeId" },
    { key: { quotaTypeCode: 1 }, name: "storeusage_quotaTypeCode" },
  ],
  usageCounters: [
    { key: { quotaTypeCode: 1 }, name: "usagecounter_quotaTypeCode" },
    { key: { softLimitLevel: 1 }, name: "usagecounter_softLimitLevel" },
    { key: { periodEnd: -1 }, name: "usagecounter_periodEnd" },
  ],
  auditLogs: [
    { key: { createdAt: -1 }, name: "auditlog_createdAt" },
    { key: { module: 1 }, name: "auditlog_module" },
    { key: { storeId: 1 }, name: "auditlog_storeId" },
  ],
  orders: [
    { key: { storeId: 1 }, name: "order_storeId" },
    { key: { createdAt: -1 }, name: "order_createdAt" },
  ],
  products: [
    { key: { storeId: 1 }, name: "product_storeId" },
  ],
};

const run = async () => {
  try {
    await connectDB();
    logger.info(`connected to ${mongoose.connection.name}`);

    for (const [collection, indexes] of Object.entries(INDEXES)) {
      const col = mongoose.connection.collection(collection);
      for (const idx of indexes) {
        try {
          const result = await col.createIndex(idx.key, {
            name: idx.name,
            background: true,
          });
          logger.info(`  ${collection}.${idx.name} -> ${result}`);
        } catch (e) {
          logger.error(`  ${collection}.${idx.name} FAILED: ${e.message}`);
        }
      }
    }

    logger.info("done");
  } catch (error) {
    logger.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
