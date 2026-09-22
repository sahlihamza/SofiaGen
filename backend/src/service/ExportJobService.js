const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ExportJob = require("../models/ExportJob");
const Notification = require("../models/Notification");
const AuditService = require("./AuditService");
const StoreExportService = require("./StoreExportService");
const logger = require("../config/logger");

const EXPORT_DIR = path.join(__dirname, "..", "..", "exports");
const EXPORT_TTL_DAYS = 7;

const ensureExportDir = () => {
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
};

class ExportJobService {
  // AUDIT-EXPORT-1: returns immediately with a job id  the actual file
  // generation happens after the HTTP response (setImmediate), so a large
  // audit export can never hold an HTTP request open or time it out.
  async requestExport({ requestedBy, source = "audit", format, filters = {} }) {
    const job = await ExportJob.create({ requestedBy, source, format, filters, status: "pending" });

    setImmediate(() => {
      this.process(job._id).catch((err) => {
        logger.error(`ExportJob ${job._id} failed:`, err.message);
      });
    });

    return job;
  }

  async process(jobId) {
    const job = await ExportJob.findById(jobId);
    if (!job) return;

    try {
      job.status = "processing";
      await job.save();

      // SO-16: store-owner data exports (orders/customers/products) reuse
      // this exact pipeline  same pattern the "audit" source already
      // established (comment used to say this was audit-only; it no longer
      // is). storeId travels inside job.filters, set server-side at request
      // time (see storeExportController.js), never trusted from the client.
      let result;
      if (job.source === "audit") {
        result = await AuditService.exportAuditLogs(job.format, job.filters || {});
      } else if (job.source === "orders") {
        result = await StoreExportService.exportOrders(job.filters?.storeId, job.filters || {}, job.format);
      } else if (job.source === "customers") {
        result = await StoreExportService.exportCustomers(job.filters?.storeId, job.filters || {}, job.format);
      } else if (job.source === "products") {
        result = await StoreExportService.exportProducts(job.filters?.storeId, job.filters || {}, job.format);
      } else {
        throw new Error(`Export source "${job.source}" is not implemented yet`);
      }

      ensureExportDir();
      const safeName = `export-${job._id}-${crypto.randomBytes(4).toString("hex")}.${job.format}`;
      const filePath = path.join(EXPORT_DIR, safeName);
      fs.writeFileSync(filePath, result.data, "utf8");

      let recordCount;
      try {
        recordCount = job.format === "json" ? JSON.parse(result.data).length : undefined;
      } catch {
        recordCount = undefined;
      }

      job.status = "completed";
      job.fileName = result.filename;
      job.filePath = filePath;
      job.recordCount = recordCount;
      job.completedAt = new Date();
      job.expiresAt = new Date(Date.now() + EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000);
      await job.save();

      await Notification.create({
        recipientModel: "User",
        recipientId: job.requestedBy,
        title: "Export ready",
        message: `Your ${job.source} export (${job.format.toUpperCase()}) is ready to download.`,
        type: "export_ready",
        category: "system",
        entityType: "system",
        priority: "normal",
        actionUrl: job.source === "audit" ? `/platform/audit-logs/exports/${job._id}` : `/store/exports/${job._id}`,
        metadata: { exportJobId: job._id },
      }).catch(() => {});
    } catch (err) {
      job.status = "failed";
      job.error = err.message;
      await job.save();

      await Notification.create({
        recipientModel: "User",
        recipientId: job.requestedBy,
        title: "Export failed",
        message: `Your ${job.source} export could not be generated: ${err.message}`,
        type: "export_failed",
        category: "system",
        entityType: "system",
        priority: "high",
      }).catch(() => {});

      throw err;
    }
  }

  async getStatus(jobId, requestingUser) {
    const job = await ExportJob.findById(jobId).lean();
    if (!job) return null;
    if (!requestingUser.isSuperAdmin && String(job.requestedBy) !== String(requestingUser._id)) {
      const err = new Error("Access denied to this export");
      err.status = 403;
      throw err;
    }
    return job;
  }

  async getDownloadStream(jobId, requestingUser) {
    const job = await this.getStatus(jobId, requestingUser);
    if (!job) {
      const err = new Error("Export not found");
      err.status = 404;
      throw err;
    }
    if (job.status !== "completed" || !job.filePath || !fs.existsSync(job.filePath)) {
      const err = new Error("Export is not ready or has expired");
      err.status = 409;
      throw err;
    }
    return { stream: fs.createReadStream(job.filePath), fileName: job.fileName };
  }

  async deleteExpired() {
    const expired = await ExportJob.find({ expiresAt: { $lt: new Date() }, status: "completed" });
    for (const job of expired) {
      if (job.filePath && fs.existsSync(job.filePath)) {
        fs.unlink(job.filePath, () => {});
      }
    }
    return ExportJob.deleteMany({ expiresAt: { $lt: new Date() } });
  }
}

module.exports = new ExportJobService();
