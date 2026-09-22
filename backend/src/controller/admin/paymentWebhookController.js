const PaymentWebhookService = require('../../service/payment/PaymentWebhookService');

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

const getWebhooks = async (req, res) => {
  try {
    const webhooks = await PaymentWebhookService.getAll(req.query);
    return res.status(200).json({ success: true, ...webhooks });
  } catch (error) {
    return handleError(res, error);
  }
};

const getWebhookById = async (req, res) => {
  try {
    const webhook = await PaymentWebhookService.getById(req.params.id);
    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found' });
    }
    return res.status(200).json({ success: true, data: webhook });
  } catch (error) {
    return handleError(res, error);
  }
};

const retryWebhook = async (req, res) => {
  try {
    const webhook = await PaymentWebhookService.retry(req.params.id);
    return res.status(200).json({ success: true, message: 'Webhook retry scheduled', data: webhook });
  } catch (error) {
    return handleError(res, error);
  }
};

const getWebhookLogs = async (req, res) => {
  try {
    const logs = await PaymentWebhookService.getWebhookLogs(req.query);
    return res.status(200).json({ success: true, ...logs });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getWebhooks,
  getWebhookById,
  retryWebhook,
  getWebhookLogs,
};
