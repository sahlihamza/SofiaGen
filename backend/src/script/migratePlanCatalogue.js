require("dotenv").config();
const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const PlanVersion = require("../models/PlanVersion");
const PlanPrice = require("../models/PlanPrice");
const Subscription = require("../models/Subscription");
const logger = require("../config/logger");

const BACKUP_COLLECTION = "plan_migration_backups";

const CYCLE_BY_LEGACY_KEY = { monthly: "monthly", yearly: "yearly" };

const backupCollection = () => mongoose.connection.db.collection(BACKUP_COLLECTION);

const recordBackup = async (batchId, entry) => {
  await backupCollection().insertOne({ batchId, createdAt: new Date(), ...entry });
};

const buildSnapshot = (plan) => ({
  name: plan.name,
  slug: plan.slug,
  description: plan.description,
  badge: plan.badge,
  color: plan.color,
  icon: plan.icon,
  pricing: plan.pricing ? JSON.parse(JSON.stringify(plan.pricing)) : {},
  features: plan.features || new Map(),
  limits: plan.limits || new Map(),
  featureRefs: plan.features
    ? [...plan.features.entries()].map(([code, enabled]) => ({
        code: String(code).toLowerCase(),
        enabled: Boolean(enabled),
      }))
    : [],
  quotaRefs: plan.limits
    ? [...plan.limits.entries()].map(([code, value]) => ({
        quotaTypeCode: String(code).toLowerCase(),
        limitValue: value === null || value === undefined ? null : Number(value),
        isUnlimited: value === null || value === undefined,
      }))
    : [],
  status: plan.status,
  isDefault: plan.isDefault,
  displayOrder: plan.displayOrder,
  visibility: plan.visibility,
  notes: plan.notes,
});

const migrate = async ({ dryRun = false } = {}) => {
  const batchId = `plan-catalogue-${Date.now()}`;
  const plans = await Plan.find({ deletedAt: null });

  const report = {
    batchId,
    dryRun,
    plansProcessed: 0,
    versionsCreated: 0,
    pricesCreated: 0,
    subscriptionsLinked: 0,
    skipped: [],
  };

  for (const plan of plans) {
    report.plansProcessed += 1;

    let version = await PlanVersion.findOne({ planId: plan._id, status: "published" }).sort({ version: -1 });

    if (!version) {
      const latest = await PlanVersion.findOne({ planId: plan._id }).sort({ version: -1 });
      const nextVersion = latest ? latest.version + 1 : 1;

      if (dryRun) {
        report.versionsCreated += 1;
      } else {
        version = await PlanVersion.create({
          planId: plan._id,
          version: nextVersion,
          snapshot: buildSnapshot(plan),
          status: "published",
          isImmutable: true,
          publishedAt: new Date(),
          source: "seeder",
          versionNote: "Migration catalogue: version initiale derivee de Plan.features/limits",
        });
        await recordBackup(batchId, {
          type: "planVersion",
          action: "created",
          planId: plan._id,
          versionId: version._id,
        });
        report.versionsCreated += 1;
      }
    }

    const existingPrices = await PlanPrice.countDocuments({ planId: plan._id });
    if (existingPrices === 0 && plan.pricing) {
      for (const [legacyKey, cycle] of Object.entries(CYCLE_BY_LEGACY_KEY)) {
        const amount = plan.pricing[legacyKey];
        if (amount === null || amount === undefined) continue;

        if (dryRun) {
          report.pricesCreated += 1;
          continue;
        }

        try {
          const price = await PlanPrice.create({
            planId: plan._id,
            currency: plan.pricing.currency || "USD",
            cycle,
            price: Number(amount),
            status: "active",
            effectiveFrom: plan.pricing.effectiveFrom || new Date(),
            effectiveTo: plan.pricing.effectiveTo || null,
          });
          await recordBackup(batchId, {
            type: "planPrice",
            action: "created",
            planId: plan._id,
            priceId: price._id,
          });
          report.pricesCreated += 1;
        } catch (err) {
          report.skipped.push({ planId: String(plan._id), cycle, reason: err.message });
        }
      }
    }

    if (!dryRun && version) {
      await recordBackup(batchId, {
        type: "plan",
        action: "currentVersionId",
        planId: plan._id,
        previousCurrentVersionId: plan.currentVersionId || null,
      });
      await Plan.updateOne({ _id: plan._id }, { $set: { currentVersionId: version._id } });
    }

    if (version) {
      const subs = await Subscription.find({ planId: plan._id, planVersionId: null }).select("_id planVersionId");
      for (const sub of subs) {
        if (dryRun) {
          report.subscriptionsLinked += 1;
          continue;
        }
        await recordBackup(batchId, {
          type: "subscription",
          action: "planVersionId",
          subscriptionId: sub._id,
          previousPlanVersionId: sub.planVersionId || null,
        });
        await Subscription.updateOne({ _id: sub._id }, { $set: { planVersionId: version._id } });
        report.subscriptionsLinked += 1;
      }
    }
  }

  return report;
};

const rollback = async (batchId) => {
  if (!batchId) throw new Error("batchId est obligatoire pour un rollback");

  const entries = await backupCollection().find({ batchId }).sort({ _id: -1 }).toArray();
  if (entries.length === 0) throw new Error(`Aucune sauvegarde trouvee pour le batch ${batchId}`);

  const report = { batchId, versionsRemoved: 0, pricesRemoved: 0, plansRestored: 0, subscriptionsRestored: 0 };

  for (const entry of entries) {
    if (entry.type === "planVersion" && entry.action === "created") {
      await PlanVersion.deleteOne({ _id: entry.versionId });
      report.versionsRemoved += 1;
    }
    if (entry.type === "planPrice" && entry.action === "created") {
      await PlanPrice.deleteOne({ _id: entry.priceId });
      report.pricesRemoved += 1;
    }
    if (entry.type === "plan" && entry.action === "currentVersionId") {
      await Plan.updateOne(
        { _id: entry.planId },
        { $set: { currentVersionId: entry.previousCurrentVersionId || null } }
      );
      report.plansRestored += 1;
    }
    if (entry.type === "subscription" && entry.action === "planVersionId") {
      await Subscription.updateOne(
        { _id: entry.subscriptionId },
        { $set: { planVersionId: entry.previousPlanVersionId || null } }
      );
      report.subscriptionsRestored += 1;
    }
  }

  await backupCollection().deleteMany({ batchId });
  return report;
};

module.exports = { migrate, rollback, BACKUP_COLLECTION, buildSnapshot };

if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const mode = process.argv[2] || "dry-run";

      if (mode === "rollback") {
        const report = await rollback(process.argv[3]);
        logger.info(`Rollback termine: ${JSON.stringify(report)}`);
      } else {
        const report = await migrate({ dryRun: mode !== "apply" });
        logger.info(`Migration (${mode}): ${JSON.stringify(report)}`);
        if (mode !== "apply") {
          logger.info("Aucune ecriture effectuee. Relancer avec 'apply' pour appliquer.");
        } else {
          logger.info(`Pour annuler: node src/script/migratePlanCatalogue.js rollback ${report.batchId}`);
        }
      }
      process.exit(0);
    } catch (err) {
      logger.error(`Migration catalogue echouee: ${err.message}`);
      process.exit(1);
    }
  })();
}
