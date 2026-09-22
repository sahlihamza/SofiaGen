const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const BackupJob = require("../models/BackupJob");
const Store = require("../models/Store");
const StoreDomain = require("../models/StoreDomain");
const UserStore = require("../models/UserStore");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const User = require("../models/User");
const Role = require("../models/Role");
const AuditService = require("./AuditService");
const { emitEvent } = require("../lib/eventBus");

/**
 * BackupJobService
 *
 * Real (bounded) configuration snapshot: store settings, domains, staff
 * memberships and collection counters are serialized to a JSON file on disk.
 * The job runs in the background with progress updates; `verify` recomputes
 * the SHA-256 checksum against the stored artifact.
 */

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(os.tmpdir(), "sofia-backups");

const ensureDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
};

const patch = (jobId, updates) =>
  BackupJob.findByIdAndUpdate(jobId, { $set: updates }, { new: true }).catch(() => null);

async function create(storeId, data = {}, actorId = null) {
  const retentionDays = Math.max(1, Number(data.retentionDays) || 30);
  const expiresAt = new Date(Date.now() + retentionDays * 86400000);
  const job = await BackupJob.create({
    storeId,
    type: data.type === "scheduled" ? "scheduled" : "manual",
    retentionDays,
    encrypted: true,
    expiresAt,
    createdBy: actorId,
  });
  runJob(job._id, storeId).catch(() => {});
  return job;
}

async function runJob(jobId, storeId) {
  try {
    await patch(jobId, { status: "running", progress: 5, startedAt: new Date() });

    const [store, domains, memberships, productCount, orderCount, customerCount] = await Promise.all([
      Store.findById(storeId).lean(),
      StoreDomain.find({ storeId }).lean(),
      UserStore.find({ storeId }).populate("userId", "name email").populate("roleId", "name").lean(),
      Product.countDocuments({ storeId }),
      Order.countDocuments({ storeId }),
      Customer.countDocuments({ storeId }),
    ]);
    await patch(jobId, { progress: 35 });

    const snapshot = {
      kind: "sofia-store-config-backup",
      version: 1,
      generatedAt: new Date().toISOString(),
      store,
      domains,
      staffMemberships: memberships.map((m) => ({
        user: m.userId ? { name: m.userId.name, email: m.userId.email } : null,
        role: m.roleId ? { name: m.roleId.name } : null,
        status: m.status,
      })),
      counts: { products: productCount, orders: orderCount, customers: customerCount },
    };
    await patch(jobId, { progress: 60 });

    ensureDir();
    const filePath = path.join(BACKUP_DIR, `${jobId}.json`);
    await fsp.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
    await patch(jobId, { progress: 85 });

    const fileBuffer = await fsp.readFile(filePath);
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    await patch(jobId, {
      status: "completed",
      progress: 100,
      size: fileBuffer.length,
      checksum,
      filePath,
      completedAt: new Date(),
    });
  } catch (err) {
    await patch(jobId, { status: "failed", error: err.message, completedAt: new Date() });
  }
}

async function list(storeId) {
  return BackupJob.find({ storeId }).sort({ createdAt: -1 }).limit(50).select("-checksum -filePath").lean();
}

async function verify(storeId, jobId) {
  const job = await BackupJob.findOne({ _id: jobId, storeId });
  if (!job) {
    const error = new Error("Backup not found");
    error.name = "NotFound";
    throw error;
  }
  if (!job.checksum || !job.filePath) {
    return { valid: false, reason: "No stored artifact for this job" };
  }
  try {
    const fileBuffer = await fsp.readFile(job.filePath);
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    return { valid: checksum === job.checksum };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
}

async function readFileForDownload(storeId, jobId) {
  const job = await BackupJob.findOne({ _id: jobId, storeId });
  if (!job || !job.filePath) {
    const error = new Error("Backup artifact not found");
    error.name = "NotFound";
    throw error;
  }
  return { buffer: await fsp.readFile(job.filePath), fileName: `backup-${storeId}-${String(jobId).slice(-8)}.json` };
}

async function remove(storeId, jobId) {
  const job = await BackupJob.findOne({ _id: jobId, storeId });
  if (!job) {
    const error = new Error("Backup not found");
    error.name = "NotFound";
    throw error;
  }
  if (job.filePath) {
    await fsp.unlink(job.filePath).catch(() => {});
  }
  await BackupJob.deleteOne({ _id: jobId });
  return { success: true };
}

const STORE_RESTORE_FIELDS = [
  "name",
  "slug",
  "subdomain",
  "domain",
  "customDomain",
  "status",
  "logo",
  "address",
  "category",
  "planId",
  "planName",
  "billingCycle",
  "subscriptionStatus",
  "trialEndsAt",
  "currentPeriodEnd",
  "nextBillingDate",
  "quotaUsage",
  "currentSubscriptionId",
  "isSelected",
  "reviewSettings",
  "themeId",
  "provisioningStatus",
  "maintenance",
];

async function restore(storeId, jobId, actorId) {
  const job = await BackupJob.findOne({ _id: jobId, storeId });
  if (!job) {
    const error = new Error("Backup not found");
    error.name = "NotFound";
    throw error;
  }

  const verification = await verify(storeId, jobId);
  if (!verification.valid) {
    const error = new Error(`Backup integrity check failed: ${verification.reason || "checksum mismatch"}`);
    error.name = "Conflict";
    error.status = 409;
    throw error;
  }

  const fileBuffer = await fsp.readFile(job.filePath);
  let snapshot;
  try {
    snapshot = JSON.parse(fileBuffer);
  } catch (err) {
    const error = new Error("Invalid backup artifact: JSON parse failed");
    error.name = "Conflict";
    error.status = 409;
    throw error;
  }

  if (snapshot.kind !== "sofia-store-config-backup" || snapshot.version !== 1) {
    const error = new Error("Unsupported backup format");
    error.name = "Conflict";
    error.status = 409;
    throw error;
  }

  const session = await mongoose.startSession();
  const summary = {
    store: { updated: 0, fields: [] },
    domains: { removed: 0, added: 0 },
    staffMemberships: { updated: 0, skipped: 0, missingUsers: [] },
    backupGeneratedAt: snapshot.generatedAt,
    backupJobId: job._id.toString(),
  };

  try {
    session.startTransaction();

    const storeUpdate = {};
    for (const field of STORE_RESTORE_FIELDS) {
      if (snapshot.store && snapshot.store[field] !== undefined) {
        storeUpdate[field] = snapshot.store[field];
        summary.store.fields.push(field);
      }
    }
    summary.store.updated = Object.keys(storeUpdate).length;

    await Store.findByIdAndUpdate(storeId, { $set: storeUpdate }, { new: true, session });

    const existingDomains = await StoreDomain.find({ storeId }).session(session);
    summary.domains.removed = existingDomains.length;
    await StoreDomain.deleteMany({ storeId }).session(session);

    if (snapshot.domains && snapshot.domains.length > 0) {
      const domainsToCreate = snapshot.domains
        .filter((d) => d && d.domain)
        .map((d) => ({
          storeId,
          domain: d.domain,
          type: d.type || "custom",
          isPrimary: Boolean(d.isPrimary),
        }));
      await StoreDomain.insertMany(domainsToCreate, { session });
      summary.domains.added = domainsToCreate.length;
    }

    if (snapshot.staffMemberships && snapshot.staffMemberships.length > 0) {
      for (const membership of snapshot.staffMemberships) {
        if (!membership.user?.email) {
          summary.staffMemberships.skipped++;
          continue;
        }

        const user = await User.findOne({ email: membership.user.email }).session(session);
        if (!user) {
          summary.staffMemberships.skipped++;
          summary.staffMemberships.missingUsers.push(membership.user.email);
          continue;
        }

        let roleId = null;
        if (membership.role?.name) {
          const role = await Role.findOne({ name: membership.role.name, storeId }).session(session);
          if (role) roleId = role._id;
        }

        const existing = await UserStore.findOne({ userId: user._id, storeId }).session(session);
        if (existing) {
          await UserStore.updateOne(
            { userId: user._id, storeId },
            { $set: { roleId, status: membership.status || "active" } },
            { session }
          );
          summary.staffMemberships.updated++;
        } else {
          summary.staffMemberships.skipped++;
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    AuditService.logAction({
      actorType: "platform_admin",
      actorId: actorId,
      module: "store",
      action: "backup_restored",
      summary: `Store configuration restored from backup ${job._id}`,
      entityType: "store",
      entityId: storeId,
      storeId: storeId,
      oldValue: { backupJobId: job._id.toString(), generatedAt: snapshot.generatedAt },
      newValue: summary,
      severity: "high",
      metadata: { backupJobId: job._id.toString(), restoredFields: summary.store.fields },
    }).catch(() => {});

    emitEvent("store.backup_restored", {
      storeId,
      backupJobId: job._id.toString(),
      restoredBy: actorId,
      summary,
    }).catch(() => {});

    return { success: true, summary };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = { create, list, verify, readFileForDownload, remove, restore };
