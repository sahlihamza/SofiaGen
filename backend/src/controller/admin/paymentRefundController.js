const PaymentRefundService = require('../../service/payment/PaymentRefundService');
const PaymentTransactionService = require('../../service/payment/PaymentTransactionService');

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

const getRefunds = async (req, res) => {
  try {
    const refunds = await PaymentRefundService.getAll(req.query);
    return res.status(200).json({ success: true, ...refunds });
  } catch (error) {
    return handleError(res, error);
  }
};

const getRefundById = async (req, res) => {
  try {
    const refund = await PaymentRefundService.getById(req.params.id);
    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }
    return res.status(200).json({ success: true, data: refund });
  } catch (error) {
    return handleError(res, error);
  }
};

const createRefund = async (req, res) => {
  try {
    const refund = await PaymentRefundService.create(req.body, req.user?._id);
    return res.status(201).json({ success: true, message: 'Refund created', data: refund });
  } catch (error) {
    return handleError(res, error);
  }
};

const approveRefund = async (req, res) => {
  try {
    const refund = await PaymentRefundService.approve(req.params.id, req.user?._id);
    return res.status(200).json({ success: true, message: 'Refund approved', data: refund });
  } catch (error) {
    return handleError(res, error);
  }
};

const rejectRefund = async (req, res) => {
  try {
    const { reason } = req.body;
    const refund = await PaymentRefundService.reject(req.params.id, req.user?._id, reason);
    return res.status(200).json({ success: true, message: 'Refund rejected', data: refund });
  } catch (error) {
    return handleError(res, error);
  }
};

const getRefundHistory = async (req, res) => {
  try {
    const history = await PaymentRefundService.getRefundHistory(req.query);
    return res.status(200).json({ success: true, ...history });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getRefunds,
  getRefundById,
  createRefund,
  approveRefund,
  rejectRefund,
  getRefundHistory,
};
