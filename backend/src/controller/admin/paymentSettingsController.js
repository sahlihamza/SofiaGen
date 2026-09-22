const PaymentSettingsService = require('../../service/payment/PaymentSettingsService');

const handleError = (res, error) => {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors || {}).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    return res.status(422).json({ success: false, message: 'Donnés invalides', errors });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Identifiant invalide' });
  }
  return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
};

const getSettings = async (req, res) => {
  try {
    const { key } = req.params;
    if (key) {
      const setting = await PaymentSettingsService.getByKey(key);
      if (!setting) {
        return res.status(404).json({ success: false, message: 'Setting not found' });
      }
      return res.status(200).json({ success: true, data: setting });
    }

    const filters = {};
    if (req.query.category) filters.category = req.query.category;
    const settings = await PaymentSettingsService.getAll(filters);
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return handleError(res, error);
  }
};

const getSettingsByCategory = async (req, res) => {
  try {
    const settings = await PaymentSettingsService.getSettingsByCategory(req.params.category);
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, type, category, description } = req.body;

    const setting = await PaymentSettingsService.upsert(key, value, type, category, description, req.user?._id);
    return res.status(200).json({ success: true, message: 'Setting updated', data: setting });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const results = [];

    for (const item of settings) {
      const result = await PaymentSettingsService.upsert(
        item.key,
        item.value,
        item.type,
        item.category,
        item.description,
        req.user?._id
      );
      results.push(result);
    }

    return res.status(200).json({ success: true, message: 'Settings updated', data: results });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getSettings,
  getSettingsByCategory,
  updateSetting,
  updateSettings,
};
