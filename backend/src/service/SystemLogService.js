const SystemLog = require("../models/SystemLog");
const { maskPii, truncate } = require("./AuditService");
const { buildUnifiedSearchQuery } = require("../utils/logSearch");

class SystemLogService {
  async log({
    level = "info",
    category,
    service,
    message,
    errorCode,
    stackTrace,
    storeId,
    userId,
    requestId,
    metadata = {},
  }) {
    try {
      await SystemLog.create({
        level,
        category,
        service,
        message: truncate(message, 2000),
        errorCode,
        stackTrace: stackTrace ? truncate(stackTrace, 5000) : undefined,
        storeId: storeId || null,
        userId: userId || null,
        requestId: requestId || null,
        metadata: maskPii(metadata || {}),
      });
    } catch (err) {
      // A logging failure must never break the request/job it's logging for.
      console.error("[SystemLogService] failed to persist log:", err.message);
    }
  }

  debug(fields) {
    return this.log({ ...fields, level: "debug" });
  }

  info(fields) {
    return this.log({ ...fields, level: "info" });
  }

  warning(fields) {
    return this.log({ ...fields, level: "warning" });
  }

  error(fields) {
    return this.log({ ...fields, level: "error" });
  }

  critical(fields) {
    return this.log({ ...fields, level: "critical" });
  }

  async getLogs(filters = {}, pagination = {}) {
    const { level, category, service, storeId, userId, requestId, search, startDate, endDate } = filters;
    const { page = 1, limit = 50, sort = "-createdAt" } = pagination;

    const query = {};
    if (level) query.level = level;
    if (category) query.category = category;
    if (service) query.service = service;
    if (storeId) query.storeId = storeId;
    if (userId) query.userId = userId;
    if (requestId) query.requestId = requestId;
    const searchQuery = buildUnifiedSearchQuery(search, {
      stringFields: ["message", "errorCode", "requestId", "service"],
      objectIdFields: ["userId", "storeId"],
    });
    if (searchQuery) Object.assign(query, searchQuery);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      SystemLog.find(query).sort(sort).skip(skip).limit(Number(limit)).populate("storeId", "name").populate("userId", "name email").lean(),
      SystemLog.countDocuments(query),
    ]);

    return { data, total, page: Number(page), totalPages: Math.ceil(total / limit) || 1 };
  }

  async getStats(filters = {}) {
    const { storeId, startDate, endDate } = filters;
    const match = {};
    if (storeId) match.storeId = storeId;
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [byLevel, byCategory, total] = await Promise.all([
      SystemLog.aggregate([{ $match: match }, { $group: { _id: "$level", count: { $sum: 1 } } }]),
      SystemLog.aggregate([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 } } }]),
      SystemLog.countDocuments(match),
    ]);

    const countFor = (arr, id) => arr.find((x) => x._id === id)?.count || 0;

    return {
      total,
      errors: countFor(byLevel, "error"),
      critical: countFor(byLevel, "critical"),
      warnings: countFor(byLevel, "warning"),
      apiErrors: byCategory.find((x) => x._id === "api")?.count || 0,
      webhookEvents: countFor(byCategory, "webhook"),
      byLevel,
      byCategory,
    };
  }

  async deleteOlderThan(days, { auditContext } = {}) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return SystemLog.deleteMany({ createdAt: { $lt: cutoff } }, auditContext ? { auditContext } : undefined);
  }
}

module.exports = new SystemLogService();
