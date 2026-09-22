const SecurityLog = require("../models/SecurityLog");
const { normalizeIp, truncate } = require("./AuditService");
const { buildUnifiedSearchQuery } = require("../utils/logSearch");

const HIGH_SEVERITY_EVENTS = new Set(["impersonation_started", "session_revoked", "permission_changed", "role_changed"]);

class SecurityLogService {
  async log({ event, userId, email, storeId, ip, userAgent, requestId, severity, metadata = {} }) {
    try {
      return await SecurityLog.create({
        event,
        userId: userId || null,
        email: email ? String(email).toLowerCase() : undefined,
        storeId: storeId || null,
        ip: ip ? normalizeIp(ip) : undefined,
        userAgent: userAgent ? truncate(userAgent, 255) : undefined,
        requestId: requestId || null,
        severity: severity || (HIGH_SEVERITY_EVENTS.has(event) ? "high" : "low"),
        metadata,
      });
    } catch (err) {
      console.error("[SecurityLogService] failed to persist event:", err.message);
      return null;
    }
  }

  async getLogs(filters = {}, pagination = {}) {
    const { event, userId, email, storeId, search, startDate, endDate } = filters;
    const { page = 1, limit = 50 } = pagination;

    const query = {};
    if (event) query.event = event;
    if (userId) query.userId = userId;
    if (email) query.email = email.toLowerCase();
    if (storeId) query.storeId = storeId;
    const searchQuery = buildUnifiedSearchQuery(search, {
      stringFields: ["email", "ip", "requestId"],
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
      SecurityLog.find(query).sort("-createdAt").skip(skip).limit(Number(limit)).populate("userId", "name email").populate("storeId", "name").lean(),
      SecurityLog.countDocuments(query),
    ]);

    return { data, total, page: Number(page), totalPages: Math.ceil(total / limit) || 1 };
  }

  // Simple brute-force signal: N failed logins for the same email within a
  // rolling window. Used by the Super Admin security view, not to block
  // login itself (that's the existing rateLimiter in middleware/auth.js).
  async countRecentFailedLogins(email, windowMinutes = 15) {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    return SecurityLog.countDocuments({ event: "failed_login", email: email.toLowerCase(), createdAt: { $gte: since } });
  }

  async deleteOlderThan(days, { auditContext } = {}) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return SecurityLog.deleteMany({ createdAt: { $lt: cutoff } }, auditContext ? { auditContext } : undefined);
  }
}

module.exports = new SecurityLogService();
