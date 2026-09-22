const PaymentMethodService = require('../../service/payment/PaymentMethodService');

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

const getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethodService.getAll(req.query);
    return res.status(200).json({ success: true, data: methods });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPaymentMethodById = async (req, res) => {
  try {
    const method = await PaymentMethodService.getById(req.params.id);
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' });
    }
    return res.status(200).json({ success: true, data: method });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethodService.create(req.body, req.user?._id);
    return res.status(201).json({ success: true, message: 'Payment method created', data: method });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethodService.update(req.params.id, req.body, req.user?._id);
    return res.status(200).json({ success: true, message: 'Payment method updated', data: method });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethodService.delete(req.params.id, req.user?._id);
    return res.status(200).json({ success: true, message: 'Payment method deleted', data: method });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
};
