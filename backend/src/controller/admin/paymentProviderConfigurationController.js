const PaymentProviderConfigurationService = require('../../service/payment/PaymentProviderConfigurationService');

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

const getConfiguration = async (req, res) => {
  try {
    const config = await PaymentProviderConfigurationService.getById(req.params.id);
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }
    return res.status(200).json({ success: true, data: config });
  } catch (error) {
    return handleError(res, error);
  }
};

const getConfigurationByProvider = async (req, res) => {
  try {
    const config = await PaymentProviderConfigurationService.getByProviderId(req.params.providerId);
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found for this provider' });
    }
    return res.status(200).json({ success: true, data: config });
  } catch (error) {
    return handleError(res, error);
  }
};

const createConfiguration = async (req, res) => {
  try {
    const config = await PaymentProviderConfigurationService.create(req.body, req.user?._id);
    return res.status(201).json({ success: true, message: 'Configuration created', data: config });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateConfiguration = async (req, res) => {
  try {
    const config = await PaymentProviderConfigurationService.update(req.params.id, req.body, req.user?._id);
    return res.status(200).json({ success: true, message: 'Configuration updated', data: config });
  } catch (error) {
    return handleError(res, error);
  }
};

const rotateKeys = async (req, res) => {
  try {
    const config = await PaymentProviderConfigurationService.rotateKeys(req.params.id, req.user?._id);
    return res.status(200).json({ success: true, message: 'Keys rotated successfully', data: config });
  } catch (error) {
    return handleError(res, error);
  }
};

const testConfiguration = async (req, res) => {
  try {
    const result = await PaymentProviderConfigurationService.testConfiguration(req.params.id);
    return res.status(200).json({ success: true, message: 'Configuration test completed', data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getConfiguration,
  getConfigurationByProvider,
  createConfiguration,
  updateConfiguration,
  rotateKeys,
  testConfiguration,
};
