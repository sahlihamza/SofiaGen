const AuditService = require("./AuditService");

// Thin backward-compatible wrapper: this module used to write directly to
// AuditLog with a different, incompatible shape (missing the required
// `module`/`actorType` fields, no PII masking)  a second parallel path into
// the same collection. It now just forwards to AuditService.logAction() so
// there is exactly one place that writes audit entries.
class AuditLogService {
  async log({ storeId, action, entityType, entityId = "", summary, metadata = {}, actor, ipAddress = "" }) {
    return AuditService.logAction({
      storeId,
      action,
      module: entityType || "system",
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      summary,
      metadata,
      actorType: actor ? "platform_admin" : "system",
      actorId: actor?._id,
      actorNameSnapshot: actor?.name || actor?.email || "",
      ip: ipAddress || undefined,
    });
  }

  async list(storeId, options = {}) {
    const { page = 1, limit = 20, action } = options;
    const { logs, pagination } = await AuditService.getAuditLogs({ storeId, action }, { page, limit });
    return { entries: logs, total: pagination.total, page: pagination.page, limit: pagination.limit };
  }
}

module.exports = new AuditLogService();
