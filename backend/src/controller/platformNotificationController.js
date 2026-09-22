const Notification = require("../models/Notification");
const NotificationTemplate = require("../models/NotificationTemplate");
const NotificationDelivery = require("../models/NotificationDelivery");
const NotificationLog = require("../models/NotificationLog");
const { EVENT_CONFIG } = require("../service/NotificationEventHandler");
const NotificationChannelConfig = require("../models/NotificationChannelConfig");
const AuditService = require("../service/AuditService");

const getOverview = async (req, res) => {
  try {
    const [totalNotifications, pendingDeliveries, sentDeliveries, failedDeliveries, totalTemplates] = await Promise.all([
      Notification.countDocuments(),
      NotificationDelivery.countDocuments({ status: "pending" }),
      NotificationDelivery.countDocuments({ status: "sent" }),
      NotificationDelivery.countDocuments({ status: "failed" }),
      NotificationTemplate.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalNotifications,
        pendingDeliveries,
        sentDeliveries,
        failedDeliveries,
        totalTemplates,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getEvents = async (req, res) => {
  try {
    const events = Object.entries(EVENT_CONFIG).map(([code, config]) => ({
      code,
      entityType: config.entityType,
      category: config.category,
      scope: config.scope,
      priority: config.priority,
      permission: config.permission || null,
      recipientModel: config.recipientModel || "User",
    }));

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getTemplates = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [total, templates] = await Promise.all([
      NotificationTemplate.countDocuments(query),
      NotificationTemplate.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    ]);

    return res.status(200).json({
      success: true,
      data: templates,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const createTemplate = async (req, res) => {
  try {
    const { code, name, description, category, enabled, channels, priority, title, message, variables } = req.body;

    const existing = await NotificationTemplate.findOne({ code: code.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Un template avec ce code existe déjà" });
    }

    const template = await NotificationTemplate.create({
      code: code.toLowerCase(),
      name,
      description,
      category,
      enabled: enabled !== undefined ? enabled : true,
      channels: channels || { in_app: true, email: false, push: false },
      priority: priority || "normal",
      title: typeof title === "string" ? { fr: title, en: title, ar: "" } : title,
      message: typeof message === "string" ? { fr: message, en: message, ar: "" } : message,
      variables: variables || [],
    });

    return res.status(201).json({
      success: true,
      message: "Template créé avec succès",
      data: template,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const template = await NotificationTemplate.findByIdAndUpdate(id, updateData, { new: true });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template introuvable" });
    }

    return res.status(200).json({
      success: true,
      message: "Template mis à jour avec succès",
      data: template,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const NOTIFICATION_CHANNEL_CATALOG = [
  { id: "in_app", name: "In-App Notifications", defaultStatus: "active", description: "Notifications internes dans l'application" },
  { id: "email", name: "Email Notifications", defaultStatus: "active", description: "Envoi d'emails via SMTP / Mailer" },
  { id: "push", name: "Push Notifications", defaultStatus: "configured", description: "Notifications Push Firebase (Prét  l'activation)" },
  { id: "sms", name: "SMS Notifications", defaultStatus: "disabled", description: "Envoi SMS via Twilio / Gateway (Réservé)" },
  { id: "whatsapp", name: "WhatsApp Notifications", defaultStatus: "disabled", description: "Alertes WhatsApp Business (Réservé)" },
];

// Write-only config keys per channel. Values are stored but never returned.
const CHANNEL_CONFIG_KEYS = {
  in_app: [],
  email: ["smtpHost", "smtpPort", "smtpUser", "smtpPass", "fromEmail", "fromName", "secure"],
  push: ["firebaseServerKey", "firebaseProjectId"],
  sms: ["provider", "accountSid", "authToken", "fromNumber"],
  whatsapp: ["businessAccountId", "accessToken", "phoneNumberId"],
};

const getChannels = async (req, res) => {
  try {
    const configs = await NotificationChannelConfig.find().lean();
    const configByChannel = new Map(configs.map((config) => [config.channelId, config]));

    const channels = NOTIFICATION_CHANNEL_CATALOG.map((catalogEntry) => {
      const persisted = configByChannel.get(catalogEntry.id);
      const rawConfig = persisted?.config || {};
      const configuredKeys = CHANNEL_CONFIG_KEYS[catalogEntry.id] || [];
      return {
        id: catalogEntry.id,
        name: catalogEntry.name,
        status: persisted?.status || catalogEntry.defaultStatus,
        description: catalogEntry.description,
        updatedAt: persisted?.updatedAt || null,
        configSet: Object.fromEntries(
          configuredKeys.map((key) => [key, rawConfig[key] !== undefined && rawConfig[key] !== null && rawConfig[key] !== ""])
        ),
      };
    });

    return res.status(200).json({ success: true, data: channels });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const SECRET_KEYS = new Set(["smtpPass", "firebaseServerKey", "authToken", "accessToken"]);

const updateChannel = async (req, res) => {
  try {
    const channelId = req.params.id;
    const allowedKeys = CHANNEL_CONFIG_KEYS[channelId];
    if (!allowedKeys) {
      return res.status(404).json({ success: false, message: `Unknown channel '${channelId}'` });
    }

    const { status, config } = req.body || {};
    if (status && !["active", "configured", "disabled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid channel status" });
    }
    if (!status && !config) {
      return res.status(400).json({ success: false, message: "Nothing to update (status or config required)" });
    }

    const existing = await NotificationChannelConfig.findOne({ channelId });
    const mergedConfig = { ...(existing?.config || {}) };
    if (config && typeof config === "object" && !Array.isArray(config)) {
      for (const key of allowedKeys) {
        if (config[key] === undefined) continue;
        // Empty string on a secret = keep the previously stored value
        if (SECRET_KEYS.has(key) && String(config[key]) === "") continue;
        mergedConfig[key] = key.endsWith("Port") || key === "secure"
          ? key === "secure" ? Boolean(config[key]) : Number(config[key]) || 0
          : String(config[key]).slice(0, 300);
      }
    }

    const nextStatus =
      status ||
      (existing?.status && existing.status !== "disabled"
        ? existing.status
        : Object.keys(mergedConfig).length > 0
          ? "configured"
          : "disabled");

    const saved = await NotificationChannelConfig.findOneAndUpdate(
      { channelId },
      {
        $set: {
          channelId,
          status: nextStatus,
          config: mergedConfig,
          updatedBy: req.userId,
        },
      },
      { upsert: true, new: true }
    );

    AuditService.logAction({
      actorType: req.user?.isSuperAdmin ? "platform_admin" : "store_owner",
      actorId: req.userId,
      module: "notification_channel",
      action: "channel.configured",
      summary: `Notification channel '${channelId}' updated (status: ${nextStatus})`,
      entityType: "notification_channel",
      entityId: saved._id,
      severity: SECRET_KEYS.size > 0 && allowedKeys.some((k) => SECRET_KEYS.has(k)) ? "high" : "medium",
      changes: { keys: Object.keys(config || {}), status: nextStatus },
      requestId: req.requestId,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Canal ${channelId} mis à jour (${nextStatus})`,
      data: {
        id: channelId,
        status: nextStatus,
        configSet: Object.fromEntries(allowedKeys.map((key) => [key, mergedConfig[key] !== undefined])),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getDeliveries = async (req, res) => {
  try {
    const { status, channel, page = 1, limit = 25 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (channel) query.channel = channel;

    const skip = (Number(page) - 1) * Number(limit);
    const [total, deliveries] = await Promise.all([
      NotificationDelivery.countDocuments(query),
      NotificationDelivery.find(query)
        .populate("notificationId", "event title category priority storeId")
        .populate("recipientId", "name email firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
    ]);

    return res.status(200).json({
      success: true,
      data: deliveries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [total, logs] = await Promise.all([
      NotificationLog.countDocuments(),
      NotificationLog.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const [totalDeliveries, sentCount, failedCount, pendingCount] = await Promise.all([
      NotificationDelivery.countDocuments(),
      NotificationDelivery.countDocuments({ status: "sent" }),
      NotificationDelivery.countDocuments({ status: "failed" }),
      NotificationDelivery.countDocuments({ status: "pending" }),
    ]);

    const successRate = totalDeliveries > 0 ? ((sentCount / totalDeliveries) * 100).toFixed(1) : "100.0";

    return res.status(200).json({
      success: true,
      data: {
        totalDeliveries,
        sentCount,
        failedCount,
        pendingCount,
        successRate: `${successRate}%`,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getOverview,
  getEvents,
  getTemplates,
  createTemplate,
  updateTemplate,
  getChannels,
  updateChannel,
  getDeliveries,
  getLogs,
  getAnalytics,
};
