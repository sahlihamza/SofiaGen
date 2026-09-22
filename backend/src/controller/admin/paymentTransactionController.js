const PaymentTransactionService = require('../../service/payment/PaymentTransactionService');
const PaymentRefundService = require('../../service/payment/PaymentRefundService');

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

const getTransactions = async (req, res) => {
  try {
    const transactions = await PaymentTransactionService.getAll(req.query);
    return res.status(200).json({ success: true, ...transactions });
  } catch (error) {
    return handleError(res, error);
  }
};

const getTransactionById = async (req, res) => {
  try {
    const transaction = await PaymentTransactionService.getById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    return res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateTransactionStatus = async (req, res) => {
  try {
    const { status, metadata } = req.body;
    const transaction = await PaymentTransactionService.updateStatus(req.params.id, status, metadata, req.user?._id);
    return res.status(200).json({ success: true, message: 'Transaction status updated', data: transaction });
  } catch (error) {
    return handleError(res, error);
  }
};

const retryTransaction = async (req, res) => {
  try {
    const transaction = await PaymentTransactionService.retryPayment(req.params.id, req.user?._id);
    return res.status(200).json({ success: true, message: 'Payment retry scheduled', data: transaction });
  } catch (error) {
    return handleError(res, error);
  }
};

const getTransactionStats = async (req, res) => {
  try {
    const stats = await PaymentTransactionService.getStats(req.query);
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return handleError(res, error);
  }
};

const exportTransactions = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const result = await PaymentTransactionService.getAll({ ...req.query, limit: 1000 });

    if (format === 'csv') {
      const { Parser } = require('json2csv');
      const parser = new Parser();
      const csv = parser.parse(result.data.map((t) => ({
        id: t._id,
        transactionId: t.transactionId,
        store: t.storeId?.name,
        provider: t.providerId?.name,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        method: t.method,
        createdAt: t.createdAt,
      })));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      return res.status(200).send(csv);
    }

    return res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    return handleError(res, error);
  }
};

const createRefundFromTransaction = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const refund = await PaymentTransactionService.processRefund(req.params.id, amount, reason, req.user?._id);
    return res.status(201).json({ success: true, message: 'Refund initiated', data: refund });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  updateTransactionStatus,
  retryTransaction,
  getTransactionStats,
  exportTransactions,
  createRefundFromTransaction,
};
