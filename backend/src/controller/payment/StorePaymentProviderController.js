const StorePaymentProviderService = require('../../service/payment/StorePaymentProviderService');

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
  if (error.code === 11000) {
    const duplicateKey = Object.keys(error.keyValue || {}).join(', ');
    return res.status(409).json({ success: false, message: `Valeur dupliqué pour ${duplicateKey}`, error: error.message });
  }
  if (error.name === 'StorePaymentProviderNotFound') {
    return res.status(404).json({ success: false, message: error.message });
  }
  if (error.name === 'DuplicateStoreProvider') {
    return res.status(409).json({ success: false, message: error.message });
  }
  if (error.name === 'PaymentProviderNotFound') {
    return res.status(404).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
};

const listStorePaymentProviders = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.body.storeId || req.currentStoreId;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId est requis' });
    }
    const result = await StorePaymentProviderService.getByStoreId(storeId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getStorePaymentProvider = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.body.storeId || req.currentStoreId;
    const providerId = req.params.providerId;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId est requis' });
    }
    const result = await StorePaymentProviderService.getOne(storeId, providerId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Configuration store/provider introuvable' });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const createStorePaymentProvider = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.body.storeId || req.currentStoreId;
    const providerId = req.body.providerId;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId est requis' });
    }
    if (!providerId) {
      return res.status(400).json({ success: false, message: 'providerId est requis' });
    }
    const result = await StorePaymentProviderService.create(storeId, providerId, req.body, req.user?._id);
    return res.status(201).json({ success: true, message: 'Payment provider configuré pour le store', data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateStorePaymentProvider = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.body.storeId || req.currentStoreId;
    const providerId = req.params.providerId;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId est requis' });
    }
    if (!providerId) {
      return res.status(400).json({ success: false, message: 'providerId est requis' });
    }
    const result = await StorePaymentProviderService.update(storeId, providerId, req.body, req.user?._id);
    return res.status(200).json({ success: true, message: 'Configuration store/provider mise  jour', data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const removeStorePaymentProvider = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.body.storeId || req.currentStoreId;
    const providerId = req.params.providerId;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId est requis' });
    }
    if (!providerId) {
      return res.status(400).json({ success: false, message: 'providerId est requis' });
    }
    const result = await StorePaymentProviderService.remove(storeId, providerId, req.user?._id);
    return res.status(200).json({ success: true, message: 'Configuration store/provider supprimée', data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getAvailableMethods = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.currentStoreId;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId est requis' });
    }
    const context = {
      country: req.query.country || req.body.country,
      currency: req.query.currency || req.body.currency,
      planId: req.query.planId || req.body.planId,
      isSubscription: req.query.isSubscription !== 'false' && req.body.isSubscription !== false,
    };
    const result = await StorePaymentProviderService.getAvailableMethods(storeId, context);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getStorePaymentCredentials = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.currentStoreId;
    const providerId = req.params.providerId;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId est requis' });
    }
    if (!providerId) {
      return res.status(400).json({ success: false, message: 'providerId est requis' });
    }
    const result = await StorePaymentProviderService.getCredentials(storeId, providerId, req.user?._id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const testStoreProviderConnection = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.currentStoreId;
    const providerId = req.params.providerId;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId est requis' });
    }
    if (!providerId) {
      return res.status(400).json({ success: false, message: 'providerId est requis' });
    }
    const result = await StorePaymentProviderService.testConnection(storeId, providerId, req.user?._id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  listStorePaymentProviders,
  getStorePaymentProvider,
  createStorePaymentProvider,
  updateStorePaymentProvider,
  removeStorePaymentProvider,
  getAvailableMethods,
  getStorePaymentCredentials,
  testStoreProviderConnection,
};
