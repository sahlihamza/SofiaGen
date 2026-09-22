const AuditLog = require("../models/AuditLog");
const PDFDocument = require("pdfkit");
const { emitEvent } = require("../lib/eventBus");
const { buildUnifiedSearchQuery } = require("../utils/logSearch");
const mongoose = require("mongoose");

// A handful of audited actions are also security-relevant. Rather than
// editing every call site across UserManagementService etc., emit the
// matching security.* event here so SecurityLogEventHandler picks it up 
// same audit call, one extra place it's recorded.
const SECURITY_EVENT_BY_ACTION = {
  impersonate_user: "security.impersonation_started",
  assign_role: "security.role_changed",
  remove_role: "security.role_changed",
  bulk_assign_role: "security.role_changed",
  reset2fa: "security.2fa_disabled",
  logout_device: "security.logout",
  logout_all_devices: "security.logout",
};

const { SENSITIVE_KEYS, sanitizeAuditPayload } = require("../utils/sanitizeAuditPayload");

const SENSITIVE_PATTERNS = SENSITIVE_KEYS;

// PII  contenu masqué même si la clé n'est pas "sensible"
const PII_PATTERNS = [
  "email",
  "phone",
  "mobile",
  "address",
  "birthdate",
  "birth_date",
  "ip_address",
  "ipAddress",
];

// Les valeurs atomiques (Date, ObjectId, Buffer, instances de classe&) ne
// doivent JAMAIS être décomposés par Object.entries() : cela transforme un
// ObjectId en objet zombie {_bsontype, id:{0:&}} que le driver MongoDB refuse
// au moment de la sérialisation ("is not a valid ObjectId").
const isMaskableContainer = (value) => {
  if (value === null || typeof value !== "object") return false;
  if (value instanceof Date) return false;
  if (Buffer.isBuffer(value)) return false;
  if (typeof RegExp !== "undefined" && value instanceof RegExp) return false;
  if (value._bsontype) return false;
  if (mongoose.Types.ObjectId && value instanceof mongoose.Types.ObjectId) return false;
  if (mongoose.Types.Decimal128 && value instanceof mongoose.Types.Decimal128) return false;
  return true;
};

const maskValue = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length <= 4) return "*".repeat(value.length);
    return value.slice(0, 2) + "*".repeat(Math.min(value.length - 4, 20)) + value.slice(-2);
  }
  if (typeof value === "number") return "[masked]";
  if (typeof value === "object" && !Array.isArray(value) && value !== null && isMaskableContainer(value)) {
    const masked = {};
    for (const [key, val] of Object.entries(value)) {
      masked[key] = isSensitiveKey(key) ? maskValue(val) : maskValue(val);
    }
    return masked;
  }
  return value;
};

const isSensitiveKey = (key) => {
  if (!key) return false;
  const lowerKey = key.toLowerCase();
  return SENSITIVE_PATTERNS.some((pattern) => lowerKey.includes(pattern.toLowerCase()));
};

const isPiiKey = (key) => {
  if (!key) return false;
  const lowerKey = key.toLowerCase();
  return PII_PATTERNS.some((pattern) => lowerKey.includes(pattern.toLowerCase()));
};

// Masque partiel pour les PII : conserve une forme reconnaissable (domaine email,
// indicatif téléphone) mais rend le corps illisible.
const maskPiiValue = (key, value) => {
  if (value === null || value === undefined) return value;
  const str = String(value);
  const lowerKey = String(key || "").toLowerCase();

  if (lowerKey.includes("email")) {
    const [local, domain] = str.split("@");
    if (!domain) return "***@***";
    const maskedLocal = local.length <= 2 ? local[0] + "***" : local.slice(0, 2) + "***";
    return `${maskedLocal}@${domain}`;
  }

  if (lowerKey.includes("phone") || lowerKey.includes("mobile")) {
    // garde l'indicatif et les 2 derniers chiffres
    if (str.length <= 4) return "****";
    return str.slice(0, 3) + "*".repeat(Math.max(0, str.length - 5)) + str.slice(-2);
  }

  // Par défaut : masque central
  if (str.length <= 4) return "*".repeat(str.length);
  return str.slice(0, 2) + "*".repeat(Math.min(str.length - 4, 20)) + str.slice(-2);
};

const maskPii = (obj, depth = 0) => {
  if (!obj || typeof obj !== "object") return obj;
  if (depth > 8) return "[depth-limit]"; // éviter une récursion infinie
  if (Array.isArray(obj)) {
    return obj.map((item) => maskPii(item, depth + 1));
  }
  // Laisser intacts Date / ObjectId / Buffer / toute instance non triviale.
  if (!isMaskableContainer(obj)) return obj;
  const masked = {};
  for (const [key, val] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      masked[key] = val !== null && val !== undefined ? "[REDACTED]" : val;
    } else if (isPiiKey(key)) {
      masked[key] = val !== null && val !== undefined ? maskPiiValue(key, val) : val;
    } else {
      masked[key] = maskPii(val, depth + 1);
    }
  }
  return masked;
};

const normalizeIp = (ip) => {
  if (!ip) return null;
  const parts = ip.split(".");
  if (parts.length === 4) {
    parts[3] = "xxx";
    return parts.join(".");
  }
  if (ip.includes(":")) {
    const colonParts = ip.split(":");
    if (colonParts.length >= 4) {
      colonParts[colonParts.length - 1] = "xxxx";
      return colonParts.join(":");
    }
  }
  return ip.slice(0, Math.floor(ip.length / 2)) + "***";
};

// Tronque user-agent pour éviter les stocks massifs tout en conservant le diagnostic.
const truncate = (str, max = 255) => {
  if (!str) return str;
  const s = String(str);
  return s.length > max ? s.slice(0, max) + "&" : s;
};

class AuditService {
  async logAction(data) {
    try {
      const maskedOldValue = data.oldValue ? maskPii(data.oldValue) : null;
      const maskedNewValue = data.newValue ? maskPii(data.newValue) : null;
      const maskedChanges = data.changes ? maskPii(data.changes) : null;
      const maskedResource = data.resource
        ? {
            ...data.resource,
            // Le nom de la ressource peut contenir un email/nom  masquage PII léger.
            name:
              typeof data.resource.name === "string"
                ? maskPiiValue("name", data.resource.name)
                : data.resource.name,
          }
        : null;
      const maskedSourceIp = data.sourceIp ? normalizeIp(data.sourceIp) : null;
      const maskedIp = data.ip ? normalizeIp(data.ip) : null;
      const maskedMetadata = data.metadata ? maskPii(data.metadata) : {};

      const summary =
        data.summary ||
        `${data.actorType || "system"} ${data.action} ${data.module}${data.entityType ? ` ${data.entityType}` : ""}`;

      const log = await AuditLog.create({
        actorType: data.actorType || "system",
        actorId: data.actorId || null,
        actorNameSnapshot: data.actorNameSnapshot || "",
module: data.module,
        action: data.action,
        summary: data.summary || "",
        reason: data.reason || null,
        entityType: data.entityType || data.resource?.type || null,
        entityId: data.entityId || data.resource?.id || null,
        resource: maskedResource,
        changes: maskedChanges,
        storeId: data.storeId || null,
        summary,
        oldValue: maskedOldValue,
        newValue: maskedNewValue,
        status: data.status || "success",
        severity: data.severity || "low",
        ip: maskedIp,
        sourceIp: maskedSourceIp,
        userAgent: truncate(data.userAgent, 255) || null,
        requestId: data.requestId || null,
        sessionId: data.sessionId || null,
        metadata: maskedMetadata,
      });

      const securityEvent = SECURITY_EVENT_BY_ACTION[data.action];
      if (securityEvent) {
        emitEvent(securityEvent, {
          userId: data.entityId || data.actorId,
          storeId: data.storeId,
          requestId: data.requestId,
          ip: data.ip,
          userAgent: data.userAgent,
          metadata: { actorId: data.actorId, entityId: data.entityId },
        });
      }

      return log;
    } catch (err) {
      // Never let an audit-log failure break the caller's real operation 
      // but DO surface it loudly, because a silent failure here previously
      // meant most of the app's audit trail was never actually persisted.
      console.error("[AuditService] Failed to create audit log:", err.message, {
        module: data.module,
        action: data.action,
      });
      return null;
    }
  }

  async getAuditLogs(filters = {}, pagination = {}) {
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
    } = filters;

    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 50;
    const skip = (page - 1) * limit;

    const query = {};

    if (module) query.module = module;
    if (action) query.action = action;
    if (actorId) query.actorId = actorId;
    if (storeId) query.storeId = storeId;
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (status) query.status = status;
    if (severity) query.severity = severity;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // STORY 3: search must reach User / Store / Entity ID / Request ID / IP,
    // not just module/action text.
    const searchQuery = buildUnifiedSearchQuery(search, {
      stringFields: ["module", "action", "entityType", "resource.name", "requestId", "ip", "sourceIp"],
      objectIdFields: ["actorId", "storeId", "entityId"],
    });
    if (searchQuery) Object.assign(query, searchQuery);

    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .populate("actorId", "name email")
      .populate("storeId", "name")
      .populate("entityId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAuditLogsByUser(userId, options = {}) {
    const { limit = 100 } = options;
    const logs = await AuditLog.find({
      $or: [{ actorId: userId }, { entityId: userId }],
    })
      .populate("actorId", "name email")
      .populate("storeId", "name")
      .populate("entityId")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return logs;
  }

  async getAuditLogsByResource(resourceType, resourceId) {
    const logs = await AuditLog.find({
      entityType: resourceType,
      entityId: resourceId,
    })
      .populate("actorId", "name email")
      .populate("storeId", "name")
      .populate("entityId")
      .sort({ createdAt: -1 })
      .lean();

    return logs;
  }

  async getRecentActivity(limit = 10) {
    return await AuditLog.find({})
      .populate("actorId", "name email image")
      .populate("storeId", "name")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async exportAuditLogs(format, filters = {}) {
    const { logs } = await this.getAuditLogs(filters, { page: 1, limit: 10000 });

    if (format === "json") {
      return {
        contentType: "application/json; charset=utf-8",
        filename: `audit-logs-${Date.now()}.json`,
        data: JSON.stringify(logs, null, 2),
      };
    }

    if (format === "csv") {
      const headers = [
        "ID",
        "Actor Type",
        "Actor Name",
        "Actor Email",
        "Module",
        "Action",
        "Entity Type",
        "Entity ID",
        "Resource Type",
        "Resource Name",
        "Store",
        "Status",
        "Severity",
        "IP",
        "User Agent",
        "Created At",
      ];

      const rows = logs.map((log) => [
        log._id,
        log.actorType || "",
        log.actorId?.name || "",
        log.actorId?.email || "",
        log.module || "",
        log.action || "",
        log.entityType || "",
        log.entityId || "",
        log.resource?.type || "",
        log.resource?.name || "",
        log.storeId?.name || log.storeId || "",
        log.status || "",
        log.severity || "",
        log.ip || "",
        log.userAgent || "",
        log.createdAt,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      return {
        contentType: "text/csv; charset=utf-8",
        filename: `audit-logs-${Date.now()}.csv`,
        data: csv,
      };
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      const bufferPromise = new Promise((resolve) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
      });

      doc.fontSize(18).text("Audit Logs Export", { align: "center" });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: "center" });
      doc.moveDown(2);

      const columns = [
        "ID", "Actor", "Module", "Action", "Entity", "Store", "Status", "Severity", "Created At",
      ];
      const colWidths = [40, 50, 45, 45, 45, 45, 35, 35, 50];
      const startX = 50;
      let y = 150;

      const drawTableHeader = () => {
        doc.fontSize(8).font("Helvetica-Bold");
        let x = startX;
        columns.forEach((col, i) => {
          doc.text(col, x, y, { width: colWidths[i], alignment: "center" });
          x += colWidths[i];
        });
        y += 14;
        doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke();
        y += 6;
      };

      drawTableHeader();

      doc.font("Helvetica");
      for (const log of logs) {
        if (y > 750) {
          doc.addPage();
          y = 50;
          drawTableHeader();
        }

        const row = [
          String(log._id).slice(-6),
          String(log.actorId?.name || log.actorType || "").slice(0, 10),
          String(log.module || "").slice(0, 8),
          String(log.action || "").slice(0, 8),
          String(log.entityType || "").slice(0, 8),
          String(log.storeId?.name || "-").slice(0, 8),
          String(log.status || "").slice(0, 8),
          String(log.severity || "").slice(0, 8),
          new Date(log.createdAt).toISOString().slice(0, 10),
        ];

        let x = startX;
        row.forEach((cell, i) => {
          doc.text(cell, x, y, { width: colWidths[i], alignment: "center" });
          x += colWidths[i];
        });
        y += 12;
      }

      doc.end();

      const pdfBuffer = await bufferPromise;
      return {
        contentType: "application/pdf",
        filename: `audit-logs-${Date.now()}.pdf`,
        data: pdfBuffer,
      };
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  async deleteOldLogs(olderThanDays = 365) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await AuditLog.deleteMany(
      { createdAt: { $lt: cutoff } },
      { auditContext: { allowMutation: true } }
    );

    return {
      deletedCount: result.deletedCount,
      cutoffDate: cutoff.toISOString(),
    };
  }

  async getStats(filters = {}) {
    const query = {};
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const [total, byAction, byStatus, bySeverity, byActorType] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: "$action", count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: "$actorType", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byAction: Object.fromEntries(byAction.map((a) => [a._id, a.count])),
      byStatus: Object.fromEntries(byStatus.map((a) => [a._id, a.count])),
      bySeverity: Object.fromEntries(bySeverity.map((a) => [a._id, a.count])),
      byActorType: Object.fromEntries(byActorType.map((a) => [a._id, a.count])),
    };
  }
}

module.exports = new AuditService();
module.exports.maskPii = maskPii;
module.exports.normalizeIp = normalizeIp;
module.exports.truncate = truncate;
module.exports.maskPiiValue = maskPiiValue;
module.exports.SENSITIVE_PATTERNS = SENSITIVE_PATTERNS;
module.exports.PII_PATTERNS = PII_PATTERNS;
