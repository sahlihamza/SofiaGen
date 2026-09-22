const AuditLog = require("../models/AuditLog");

/**
 * Log an action in the platform-wide audit log
 * @param {Object} params
 * @param {string} params.actorType - "platform_admin", "store_owner", "system"
 * @param {ObjectId} params.actorId - User who performed the action
 * @param {string} params.module - e.g., "plans", "stores", "subscriptions"
 * @param {string} params.action - e.g., "create", "update", "delete"
 * @param {string} params.entityType - e.g., "plan", "store", "invoice"
 * @param {ObjectId} params.entityId - ID of the entity
 * @param {ObjectId} params.storeId - Related store (optional)
 * @param {Object} params.oldValue - Previous state (optional)
 * @param {Object} params.newValue - New state (optional)
 * @param {string} params.ip - IP address (optional)
 * @param {string} params.userAgent - User agent (optional)
 */
const createAuditLog = async (params) => {
  try {
    return await AuditLog.create(params);
  } catch (err) {
    console.error("Failed to create audit log:", err);
    // Don't throw - audit logging should not break the main flow
  }
};

/**
 * Get audit logs with filtering and pagination
 */
const getAuditLogs = async (req, res) => {
  try {
    const {
      module,
      action,
      actorId,
      storeId,
      page = 1,
      limit = 50,
      search = "",
      startDate,
      endDate,
    } = req.query;

    const query = {};
    if (module) query.module = module;
    if (action) query.action = action;
    if (actorId) query.actorId = actorId;
    if (storeId) query.storeId = storeId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .populate("actorId", "name email")
      .populate("storeId", "name")
      .populate("entityId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get audit log details by ID
 */
const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await AuditLog.findById(id)
      .populate("actorId", "name email")
      .populate("storeId", "name")
      .populate("entityId")
      .lean();

    if (!log) {
      return res.status(404).json({ success: false, message: "Audit log not found" });
    }

    res.status(200).json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const auditLogService = require("../service/auditLogService");

const listAuditLog = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page, limit, action } = req.query;
    const result = await auditLogService.list(storeId, { page, limit, action });

    return res.status(200).json({
      success: true,
      message: "Journal d'audit récupéré avec succès",
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

module.exports = {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  listAuditLog,
};
