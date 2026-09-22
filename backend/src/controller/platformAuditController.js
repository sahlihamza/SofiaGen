const AuditService = require("../service/AuditService");
const ExportJobService = require("../service/ExportJobService");
const AuditLog = require("../models/AuditLog");
const SystemLog = require("../models/SystemLog");
const SecurityLog = require("../models/SecurityLog");
const WebhookLog = require("../models/WebhookLog");
const JobLog = require("../models/JobLog");

// A non-superadmin caller only ever has requests scoped to their own store
// (enforced upstream by scopeQueryToOwnStore on list endpoints), but a
// direct by-id lookup bypasses that query filter  so re-check ownership
// here against the record actually found.
const assertStoreAccess = (req, record) => {
  if (!record) return true;
  if (req.user?.isSuperAdmin) return true;
  const userStoreIds = [...(req.user?.storeIds || []), req.user?.currentStoreId, req.user?.selectedStore]
    .filter(Boolean)
    .map(String);
  if (!record.storeId) return true;
  return userStoreIds.includes(String(record.storeId));
};

const getAuditLogs = async (req, res) => {
  try {
    const {
      module,
      action,
      actorId,
      storeId,
      entityType,
      entityId,
      status,
      severity,
      search = "",
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const filters = {
      module,
      action,
      actorId,
      storeId,
      entityType,
      entityId,
      status,
      severity,
      search,
      startDate,
      endDate,
    };

    const pagination = { page, limit };

    const result = await AuditService.getAuditLogs(filters, pagination);

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const found = await AuditLog.findById(id)
      .populate("actorId", "name email")
      .populate("storeId", "name")
      .lean();

    if (!found) {
      return res.status(404).json({
        success: false,
        message: "Entré d'audit introuvable",
      });
    }

    if (!assertStoreAccess(req, found)) {
      return res.status(403).json({ success: false, message: "Accès refusé  cette entré" });
    }

    return res.status(200).json({
      success: true,
      data: found,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// STORY 12  Request ID correlation: pull every trace of a single request
// across all log collections (API request -> audit -> system -> security ->
// webhook -> job) so the Super Admin can follow e.g. a failed payment all
// the way through the chain.
const getByRequestId = async (req, res) => {
  try {
    const { requestId } = req.params;
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
    const userStoreIds = [...(req.user?.storeIds || []), req.user?.currentStoreId, req.user?.selectedStore].filter(Boolean);
    const storeFilter = isSuperAdmin ? {} : { storeId: { $in: userStoreIds } };

    const [auditEntries, systemEntries, securityEntries, webhookEntries] = await Promise.all([
      AuditLog.find({ requestId, ...storeFilter }).sort("createdAt").lean(),
      SystemLog.find({ requestId, ...storeFilter }).sort("createdAt").lean(),
      SecurityLog.find({ requestId, ...storeFilter }).sort("createdAt").lean(),
      WebhookLog.find({ requestId, ...storeFilter }).sort("createdAt").lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: { requestId, audit: auditEntries, system: systemEntries, security: securityEntries, webhooks: webhookEntries },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getUserActivityLog = async (req, res) => {
  try {
    const { userId } = req.params;
    const logs = await AuditService.getAuditLogsByUser(userId);

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getResourceAuditLog = async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const logs = await AuditService.getAuditLogsByResource(resourceType, resourceId);

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const exportAuditLogs = async (req, res) => {
  try {
    const { format = "json" } = req.body;
    const filters = {
      module: req.body.module,
      action: req.body.action,
      actorId: req.body.actorId,
      storeId: req.body.storeId,
      entityType: req.body.entityType,
      status: req.body.status,
      severity: req.body.severity,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      search: req.body.search,
    };

    const result = await AuditService.exportAuditLogs(format, filters);

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);

    if (format === "pdf") {
      return res.send(result.data);
    }

    return res.send(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// AUDIT-EXPORT-1: background export. Returns 202 + jobId immediately;
// the file is generated after the response via ExportJobService, and the
// requester is notified in-app once it's ready. Same filters as the
// synchronous exportAuditLogs above, for large result sets.
const requestAsyncExport = async (req, res) => {
  try {
    const { format = "json" } = req.body;
    if (!["csv", "json"].includes(format)) {
      return res.status(400).json({ success: false, message: "format must be csv or json" });
    }

    const filters = {
      module: req.body.module,
      action: req.body.action,
      actorId: req.body.actorId,
      storeId: req.body.storeId,
      entityType: req.body.entityType,
      status: req.body.status,
      severity: req.body.severity,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      search: req.body.search,
    };

    // AUDIT-SECURITY-1: this is a POST with filters in the body, so the
    // query-based scopeQueryToOwnStore middleware can't reach storeId here 
    // apply the same store-scoping rule directly.
    if (!req.user.isSuperAdmin) {
      const userStoreIds = [...(req.user.storeIds || []), req.user.currentStoreId, req.user.selectedStore]
        .filter(Boolean)
        .map(String);
      if (userStoreIds.length === 0) {
        return res.status(403).json({ success: false, message: "Aucune boutique associé  ce compte" });
      }
      if (filters.storeId && !userStoreIds.includes(String(filters.storeId))) {
        return res.status(403).json({ success: false, message: "Accès refusé  ce store" });
      }
      filters.storeId = filters.storeId || userStoreIds[0];
    }

    const job = await ExportJobService.requestExport({
      requestedBy: req.user._id,
      source: "audit",
      format,
      filters,
    });

    return res.status(202).json({ success: true, data: { jobId: job._id, status: job.status } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getExportStatus = async (req, res) => {
  try {
    const job = await ExportJobService.getStatus(req.params.jobId, req.user);
    if (!job) return res.status(404).json({ success: false, message: "Export introuvable" });
    return res.json({ success: true, data: job });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const downloadExport = async (req, res) => {
  try {
    const { stream, fileName } = await ExportJobService.getDownloadStream(req.params.jobId, req.user);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    const ext = fileName.split(".").pop().toLowerCase();
    if (ext === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
    } else if (ext === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    stream.pipe(res);
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const cleanupOldLogs = async (req, res) => {
  try {
    const olderThanDays = parseInt(req.query.days) || 365;
    const result = await AuditService.deleteOldLogs(olderThanDays);

    return res.status(200).json({
      success: true,
      message: `Nettoyage terminé : ${result.deletedCount} entrés supprimées`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getAuditStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await AuditService.getStats({ startDate, endDate });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
  getUserActivityLog,
  getResourceAuditLog,
  exportAuditLogs,
  requestAsyncExport,
  getExportStatus,
  downloadExport,
  cleanupOldLogs,
  getAuditStats,
  getByRequestId,
};
