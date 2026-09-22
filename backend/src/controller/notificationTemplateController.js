const NotificationTemplate = require("../models/NotificationTemplate");

// Whitelist  clients must never set `code` on update (it is the lookup key
// used by notification senders) nor inject unknown fields.
const CHANNEL_KEYS = ["in_app", "email", "push"];
const LOCALE_KEYS = ["fr", "en", "ar"];

const sanitizeChannels = (channels) => {
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) return undefined;
  const out = {};
  for (const key of CHANNEL_KEYS) {
    if (typeof channels[key] === "boolean") out[key] = channels[key];
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const sanitizeLocalized = (value, maxLength = 500) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out = {};
  for (const key of LOCALE_KEYS) {
    if (typeof value[key] === "string") out[key] = value[key].slice(0, maxLength);
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const getAllTemplates = async (req, res) => {
  try {
    const filters = {};
    if (req.query.category) filters.category = req.query.category;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    const [total, templates] = await Promise.all([
      NotificationTemplate.countDocuments(filters),
      NotificationTemplate.find(filters)
        .sort({ category: 1, code: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    res.json({
      success: true,
      templates,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template introuvable" });
    }
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createTemplate = async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {};

    const code = String(body.code || "").trim().toLowerCase();
    if (!code) return res.status(400).json({ success: false, message: "Code is required" });
    payload.code = code;

    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ success: false, message: "Name is required" });
    payload.name = name.slice(0, 120);

    const category = String(body.category || "").trim();
    if (!category) return res.status(400).json({ success: false, message: "Category is required" });
    payload.category = category.slice(0, 60);

    const title = sanitizeLocalized(body.title);
    if (!title) return res.status(400).json({ success: false, message: "Title (at least one locale) is required" });
    payload.title = title;

    const message = sanitizeLocalized(body.message);
    if (!message) return res.status(400).json({ success: false, message: "Message (at least one locale) is required" });
    payload.message = message;

    const channels = sanitizeChannels(body.channels);
    if (channels) payload.channels = channels;
    if (typeof body.enabled === "boolean") payload.enabled = body.enabled;
    if (["low", "normal", "high", "critical"].includes(body.priority)) payload.priority = body.priority;
    if (Array.isArray(body.variables)) {
      payload.variables = body.variables.filter((v) => typeof v === "string").slice(0, 30);
    }
    if (typeof body.description === "string") payload.description = body.description.slice(0, 500);

    const template = await NotificationTemplate.create(payload);
    res.status(201).json({ success: true, template });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Un template avec ce code existe déjà" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};

    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    const channels = sanitizeChannels(body.channels);
    if (channels) updates.channels = channels;
    const title = sanitizeLocalized(body.title);
    if (title) updates.title = title;
    const message = sanitizeLocalized(body.message);
    if (message) updates.message = message;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No editable fields provided (enabled, channels, title, message)" });
    }

    const template = await NotificationTemplate.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template introuvable" });
    }
    res.json({ success: true, template });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const template = await NotificationTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template introuvable" });
    }
    res.json({ success: true, message: "Template supprimé" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
