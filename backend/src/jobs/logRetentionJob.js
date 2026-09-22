const logger = require("../config/logger");
const AuditService = require("../service/AuditService");
const SystemLogService = require("../service/SystemLogService");
const SecurityLogService = require("../service/SecurityLogService");
const WebhookLogService = require("../service/WebhookLogService");
const JobLogService = require("../service/JobLogService");
const ExportJobService = require("../service/ExportJobService");
const SystemLog = require("../models/SystemLog");

// LOG-RETENTION-1: configurable retention per log type. Defaults match the
// ticket's example values but can be overridden per deployment via env vars
//  audit/security logs are kept far longer than technical noise since they
// may be needed for compliance review long after the fact.
const RETENTION_DAYS = {
  applicationLogs: Number(process.env.LOG_RETENTION_APPLICATION_DAYS) || 30,
  apiLogs: Number(process.env.LOG_RETENTION_API_DAYS) || 90,
  webhookLogs: Number(process.env.LOG_RETENTION_WEBHOOK_DAYS) || 90,
  jobLogs: Number(process.env.LOG_RETENTION_JOB_DAYS) || 90,
  securityLogs: Number(process.env.LOG_RETENTION_SECURITY_DAYS) || 365,
  auditLogs: Number(process.env.LOG_RETENTION_AUDIT_DAYS) || 730,
};

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

const runLogRetention = async () => {
  const cutoffApi = new Date(Date.now() - RETENTION_DAYS.apiLogs * 24 * 60 * 60 * 1000);
  const cutoffApp = new Date(Date.now() - RETENTION_DAYS.applicationLogs * 24 * 60 * 60 * 1000);

  const [apiLogsDeleted, appLogsDeleted, webhookLogsDeleted, jobLogsDeleted, securityLogsDeleted, auditLogsResult, exportJobsResult] =
    await Promise.all([
      SystemLog.deleteMany({ category: "api", createdAt: { $lt: cutoffApi } }),
      SystemLog.deleteMany({ category: { $ne: "api" }, createdAt: { $lt: cutoffApp } }),
      WebhookLogService.deleteOlderThan(RETENTION_DAYS.webhookLogs),
      JobLogService.deleteOlderThan(RETENTION_DAYS.jobLogs),
      SecurityLogService.deleteOlderThan(RETENTION_DAYS.securityLogs, { auditContext: { allowMutation: true } }),
      AuditService.deleteOldLogs(RETENTION_DAYS.auditLogs),
      // AUDIT-EXPORT-1: also deletes the generated files on disk, not just
      // the ExportJob records, so the exports/ directory doesn't grow forever.
      ExportJobService.deleteExpired(),
    ]);

  const summary = {
    apiLogsDeleted: apiLogsDeleted.deletedCount,
    appLogsDeleted: appLogsDeleted.deletedCount,
    webhookLogsDeleted: webhookLogsDeleted.deletedCount,
    jobLogsDeleted: jobLogsDeleted.deletedCount,
    securityLogsDeleted: securityLogsDeleted.deletedCount,
    auditLogsDeleted: auditLogsResult.deletedCount,
    exportJobsDeleted: exportJobsResult.deletedCount,
  };

  logger.info(`logRetentionJob: ${JSON.stringify(summary)}`);
  return summary;
};

const startLogRetentionJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (process.env.ENABLE_LOG_RETENTION_JOB === "false") {
    logger.info("logRetentionJob: disabled (set ENABLE_LOG_RETENTION_JOB=false to disable; on by default).");
    return null;
  }

  const runSafely = () => {
    JobLogService.runJob("logRetentionJob", runLogRetention).catch((err) =>
      logger.error("logRetentionJob failed:", err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = { runLogRetention, startLogRetentionJob, RETENTION_DAYS };
