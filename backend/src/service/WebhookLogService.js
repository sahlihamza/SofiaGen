const WebhookLog = require("../models/WebhookLog");
const { buildUnifiedSearchQuery } = require("../utils/logSearch");

// LOG-3: retry is source-agnostic. Each concrete webhook source (payment,
// and any future one  shipping, custom integrations...) registers its own
// retry handler here instead of the controller hardcoding "if payment then
// ...". Adding a new webhook type only means calling
// registerRetryHandler("MyNewSource", async (sourceRef) => {...}) once,
// nothing else changes.
const retryHandlers = new Map();

class WebhookLogService {
  registerRetryHandler(sourceModel, handler) {
    retryHandlers.set(sourceModel, handler);
  }

  async record(data) {
    try {
      return await WebhookLog.create(data);
    } catch (err) {
      console.error("[WebhookLogService] failed to record webhook log:", err.message);
      return null;
    }
  }

  async retry(webhookLogId) {
    const log = await WebhookLog.findById(webhookLogId);
    if (!log) {
      const err = new Error("Webhook log not found");
      err.status = 404;
      throw err;
    }

    const handler = log.sourceModel && retryHandlers.get(log.sourceModel);
    if (!handler || !log.sourceRef) {
      const err = new Error(`Retry is not supported for webhook source "${log.sourceModel || "unknown"}"`);
      err.status = 400;
      throw err;
    }

    const result = await handler(log.sourceRef);

    log.status = "retrying";
    log.attempts = (log.attempts || 1) + 1;
    await log.save();

    return { webhookLog: log, sourceResult: result };
  }

  async getLogs(filters = {}, pagination = {}) {
    const { provider, storeId, event, status, search, requestId, startDate, endDate } = filters;
    const { page = 1, limit = 50 } = pagination;

    const query = {};
    if (provider) query.provider = provider;
    if (storeId) query.storeId = storeId;
    if (event) query.event = event;
    if (status) query.status = status;
    if (requestId) query.requestId = requestId;
    const searchQuery = buildUnifiedSearchQuery(search, {
      stringFields: ["event", "provider", "errorMessage", "requestId"],
      objectIdFields: ["storeId"],
    });
    if (searchQuery) Object.assign(query, searchQuery);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      WebhookLog.find(query).sort("-createdAt").skip(skip).limit(Number(limit)).populate("storeId", "name").lean(),
      WebhookLog.countDocuments(query),
    ]);

    return { data, total, page: Number(page), totalPages: Math.ceil(total / limit) || 1 };
  }

  async deleteOlderThan(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return WebhookLog.deleteMany({ createdAt: { $lt: cutoff } });
  }
}

module.exports = new WebhookLogService();
