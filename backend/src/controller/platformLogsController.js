const SystemLogService = require("../service/SystemLogService");
const SecurityLogService = require("../service/SecurityLogService");
const WebhookLogService = require("../service/WebhookLogService");
const JobLogService = require("../service/JobLogService");
const AuditService = require("../service/AuditService");
const WebhookLog = require("../models/WebhookLog");

const pick = (query, keys) => keys.reduce((acc, k) => (query[k] !== undefined ? { ...acc, [k]: query[k] } : acc), {});

// LOG-6: shared "Today / Yesterday / Last 7 days / Last 30 days / Custom"
// period resolution used by every logs endpoint's date filter.
const resolvePeriod = (query) => {
  if (query.startDate || query.endDate) return { startDate: query.startDate, endDate: query.endDate };
  const now = new Date();
  switch (query.period) {
    case "today": {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "yesterday": {
      const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case "last7days": {
      const start = new Date(now); start.setDate(start.getDate() - 7);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case "last30days": {
      const start = new Date(now); start.setDate(start.getDate() - 30);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    default:
      return {};
  }
};

const getSystemLogs = async (req, res) => {
  try {
    const filters = { ...pick(req.query, ["level", "category", "service", "storeId", "userId", "requestId", "search"]), ...resolvePeriod(req.query) };
    const result = await SystemLogService.getLogs(filters, pick(req.query, ["page", "limit"]));
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSecurityLogs = async (req, res) => {
  try {
    const filters = { ...pick(req.query, ["event", "userId", "email", "storeId", "search"]), ...resolvePeriod(req.query) };
    const result = await SecurityLogService.getLogs(filters, pick(req.query, ["page", "limit"]));
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWebhookLogs = async (req, res) => {
  try {
    const filters = { ...pick(req.query, ["provider", "storeId", "event", "status", "search"]), ...resolvePeriod(req.query) };
    const result = await WebhookLogService.getLogs(filters, pick(req.query, ["page", "limit"]));
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// LOG-3: manual retry for a failed webhook, dispatched generically via
// WebhookLogService's handler registry  works for any webhook source that
// has registered itself (see PaymentWebhookService for the pattern), not
// hardcoded to payments.
const retryWebhook = async (req, res) => {
  try {
    const result = await WebhookLogService.retry(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getJobLogs = async (req, res) => {
  try {
    const filters = { ...pick(req.query, ["jobName", "status", "search"]), ...resolvePeriod(req.query) };
    const result = await JobLogService.getLogs(filters, pick(req.query, ["page", "limit"]));
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// LOG-5: Logs Dashboard KPIs.
const getDashboardStats = async (req, res) => {
  try {
    const period = resolvePeriod(req.query);
    const storeId = req.query.storeId;

    const [systemStats, auditStats, failedWebhooks, failedJobs, securityEventsCount] = await Promise.all([
      SystemLogService.getStats({ storeId, ...period }),
      AuditService.getStats(period),
      WebhookLog.countDocuments({ status: "failed", ...(storeId ? { storeId } : {}) }),
      require("../models/JobLog").countDocuments({ status: "failed" }),
      require("../models/SecurityLog").countDocuments({}),
    ]);

    res.json({
      success: true,
      data: {
        totalLogs: systemStats.total,
        errors: systemStats.errors,
        criticalErrors: systemStats.critical,
        apiErrors: systemStats.apiErrors,
        webhookFailures: failedWebhooks,
        failedJobs,
        securityEvents: securityEventsCount,
        auditStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSystemLogs,
  getSecurityLogs,
  getWebhookLogs,
  retryWebhook,
  getJobLogs,
  getDashboardStats,
};
