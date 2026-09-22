const PaymentProviderService = require('../../service/payment/PaymentProviderService');

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
  return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
};

const getPaymentProviders = async (req, res) => {
  try {
    const result = await PaymentProviderService.getAll(req.query);
    return res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPaymentProviderById = async (req, res) => {
  try {
    const provider = await PaymentProviderService.getById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Payment provider not found' });
    }
    return res.status(200).json({ success: true, data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPaymentProvider = async (req, res) => {
  try {
    const provider = await PaymentProviderService.create(req.body, req.user?._id);
    return res.status(201).json({ success: true, message: 'Payment provider created', data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePaymentProvider = async (req, res) => {
  try {
    const provider = await PaymentProviderService.update(req.params.id, req.body, req.user?._id);
    return res.status(200).json({ success: true, message: 'Payment provider updated', data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePaymentProvider = async (req, res) => {
  try {
    const provider = await PaymentProviderService.delete(req.params.id, req.user?._id);
    return res.status(200).json({ success: true, message: 'Payment provider deleted', data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const toggleProviderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const provider = await PaymentProviderService.toggleStatus(req.params.id, status, req.user?._id);
    return res.status(200).json({ success: true, message: 'Provider status updated', data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const testProviderConnection = async (req, res) => {
  try {
    const result = await PaymentProviderService.testConnection(req.params.id);
    return res.status(200).json({ success: true, message: 'Connection test completed', data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getPaymentProviders,
  getPaymentProviderById,
  createPaymentProvider,
  updatePaymentProvider,
  deletePaymentProvider,
  toggleProviderStatus,
  testProviderConnection,
};
