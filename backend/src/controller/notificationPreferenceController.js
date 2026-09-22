const NotificationPreference = require("../models/NotificationPreference");
const { CRITICAL_CATEGORIES } = require("../models/NotificationPreference");
const NotificationLog = require("../models/NotificationLog");
const { resolveStoreId } = require("../utils/requestContext");

const getScopedStoreId = (req, requestedStoreId) => {
  const currentStoreId = resolveStoreId(req) || null;
  if (requestedStoreId && String(requestedStoreId) !== String(currentStoreId)) {
    const error = new Error("Access denied for this store");
    error.statusCode = 403;
    throw error;
  }
  return currentStoreId;
};

const enforceCriticalCategories = (preferences = {}) => {
  const result = { ...preferences };
  for (const category of CRITICAL_CATEGORIES) {
    result[category] = {
      ...(result[category] || {}),
      in_app: true,
      email: true,
    };
  }
  return result;
};

const getPreferences = async (req, res) => {
  try {
    const storeId = getScopedStoreId(req, req.query.storeId);
    const pref = await NotificationPreference.findOne({ userId: req.user._id, storeId });

    res.json({
      success: true,
      preferences: pref?.preferences || {},
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const storeId = getScopedStoreId(req, req.body.storeId);
    const preferences = enforceCriticalCategories(req.body.preferences || {});

    const pref = await NotificationPreference.findOneAndUpdate(
      { userId: req.user._id, storeId },
      { $set: { preferences } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await NotificationLog.create({
      action: "notification.preference.updated",
      actorId: req.user._id,
      storeId,
    }).catch(() => {});

    res.json({ success: true, preferences: pref.preferences });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

module.exports = { getPreferences, updatePreferences };
