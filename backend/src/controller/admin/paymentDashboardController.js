const PaymentDashboardService = require('../../service/payment/PaymentDashboardService');

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

const getDashboardStats = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      providerId: req.query.providerId,
      storeId: req.query.storeId,
      currency: req.query.currency,
      status: req.query.status,
    };

    const stats = await PaymentDashboardService.getDashboardStats(filters);
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return handleError(res, error);
  }
};

const getVolumeByProvider = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const data = await PaymentDashboardService.getVolumeByProvider(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getVolumeByCountry = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const data = await PaymentDashboardService.getVolumeByCountry(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getVolumeByCurrency = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const data = await PaymentDashboardService.getVolumeByCurrency(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getRevenueByMonth = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const data = await PaymentDashboardService.getRevenueByMonth(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getTopProviders = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const limit = parseInt(req.query.limit || 10, 10);
    const data = await PaymentDashboardService.getTopProviders(filters, limit);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getAlerts = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const data = await PaymentDashboardService.getAlerts(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getDashboardStats,
  getVolumeByProvider,
  getVolumeByCountry,
  getVolumeByCurrency,
  getRevenueByMonth,
  getTopProviders,
  getAlerts,
};
