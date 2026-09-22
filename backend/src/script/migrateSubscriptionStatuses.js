require("dotenv").config();
const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const logger = require("../config/logger");
const { LEGACY_ALIASES } = require("../utils/subscriptionStatus");

const BACKUP_COLLECTION = "subscription_status_migration_backups";

const backupCollection = () => mongoose.connection.db.collection(BACKUP_COLLECTION);

const migrate = async ({ dryRun = false } = {}) => {
  const batchId = `subscription-status-${Date.now()}`;
  const report = { batchId, dryRun, byAlias: {}, total: 0 };

  for (const [legacy, canonical] of Object.entries(LEGACY_ALIASES)) {
    const docs = await Subscription.find({ status: legacy }).select("_id status").lean();
    report.byAlias[`${legacy}->${canonical}`] = docs.length;
    report.total += docs.length;

    if (dryRun || docs.length === 0) continue;

    await backupCollection().insertMany(
      docs.map((d) => ({
        batchId,
        createdAt: new Date(),
        subscriptionId: d._id,
        previousStatus: d.status,
        newStatus: canonical,
      }))
    );

    await Subscription.collection.updateMany(
      { _id: { $in: docs.map((d) => d._id) } },
      { $set: { status: canonical } }
    );
  }

  return report;
};

const rollback = async (batchId) => {
  if (!batchId) throw new Error("batchId est obligatoire pour un rollback");

  const entries = await backupCollection().find({ batchId }).toArray();
  if (entries.length === 0) throw new Error(`Aucune sauvegarde pour le batch ${batchId}`);

  for (const entry of entries) {
    await Subscription.collection.updateOne(
      { _id: entry.subscriptionId },
      { $set: { status: entry.previousStatus } }
    );
  }

  await backupCollection().deleteMany({ batchId });
  return { batchId, restored: entries.length };
};

const verify = async () => {
  const remaining = {};
  for (const legacy of Object.keys(LEGACY_ALIASES)) {
    remaining[legacy] = await Subscription.countDocuments({ status: legacy });
  }
  return remaining;
};

module.exports = { migrate, rollback, verify, BACKUP_COLLECTION };

if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const mode = process.argv[2] || "dry-run";

      if (mode === "rollback") {
        logger.info(`Rollback: ${JSON.stringify(await rollback(process.argv[3]))}`);
      } else if (mode === "verify") {
        logger.info(`Statuts legacy restants: ${JSON.stringify(await verify())}`);
      } else {
        const report = await migrate({ dryRun: mode !== "apply" });
        logger.info(`Migration statuts (${mode}): ${JSON.stringify(report)}`);
        if (mode === "apply" && report.total > 0) {
          logger.info(
            `Pour annuler: node src/script/migrateSubscriptionStatuses.js rollback ${report.batchId}`
          );
        }
      }
      process.exit(0);
    } catch (err) {
      logger.error(`Migration statuts echouee: ${err.message}`);
      process.exit(1);
    }
  })();
}
