const PaymentRuleService = require('../../service/payment/PaymentRuleService');

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

const getPaymentRules = async (req, res) => {
  try {
    const rules = await PaymentRuleService.getAll(req.query);
    return res.status(200).json({ success: true, data: rules });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPaymentRuleById = async (req, res) => {
  try {
    const rule = await PaymentRuleService.getById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Payment rule not found' });
    }
    return res.status(200).json({ success: true, data: rule });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPaymentRule = async (req, res) => {
  try {
    const rule = await PaymentRuleService.create(req.body, req.user?._id);
    return res.status(201).json({ success: true, message: 'Payment rule created', data: rule });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePaymentRule = async (req, res) => {
  try {
    const rule = await PaymentRuleService.update(req.params.id, req.body, req.user?._id);
    return res.status(200).json({ success: true, message: 'Payment rule updated', data: rule });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePaymentRule = async (req, res) => {
  try {
    const rule = await PaymentRuleService.delete(req.params.id, req.user?._id);
    return res.status(200).json({ success: true, message: 'Payment rule deleted', data: rule });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getPaymentRules,
  getPaymentRuleById,
  createPaymentRule,
  updatePaymentRule,
  deletePaymentRule,
};
