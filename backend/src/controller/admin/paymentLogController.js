const PaymentLogService = require('../../service/payment/PaymentLogService');

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

const getLogs = async (req, res) => {
  try {
    const logs = await PaymentLogService.getLogs(req.query);
    return res.status(200).json({ success: true, ...logs });
  } catch (error) {
    return handleError(res, error);
  }
};

const getLogsByModule = async (req, res) => {
  try {
    const logs = await PaymentLogService.getLogsByModule(req.params.module, req.query);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return handleError(res, error);
  }
};

const clearOldLogs = async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const deletedCount = await PaymentLogService.clearOldLogs(days);
    return res.status(200).json({ success: true, message: `Cleared ${deletedCount} old logs`, data: { deletedCount } });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getLogs,
  getLogsByModule,
  clearOldLogs,
};
