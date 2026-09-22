const CarrierProviderService = require('../../service/shipping/CarrierProviderService');

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
  if (error.message && error.message.includes('isInternalFleet')) {
    return res.status(409).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
};

const getCarrierProviders = async (req, res) => {
  try {
    const result = await CarrierProviderService.getAll(req.query);
    return res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCarrierProviderById = async (req, res) => {
  try {
    const provider = await CarrierProviderService.getById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Carrier provider not found' });
    }
    return res.status(200).json({ success: true, data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const createCarrierProvider = async (req, res) => {
  try {
    const provider = await CarrierProviderService.create(req.body, req.user?._id);
    return res.status(201).json({ success: true, message: 'Carrier provider created', data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCarrierProvider = async (req, res) => {
  try {
    const provider = await CarrierProviderService.update(req.params.id, req.body, req.user?._id);
    return res.status(200).json({ success: true, message: 'Carrier provider updated', data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const toggleCarrierActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    const provider = await CarrierProviderService.toggleActive(req.params.id, isActive, req.user?._id);
    return res.status(200).json({ success: true, message: 'Carrier provider status updated', data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteCarrierProvider = async (req, res) => {
  try {
    const provider = await CarrierProviderService.delete(req.params.id, req.user?._id);
    return res.status(200).json({ success: true, message: 'Carrier provider deleted', data: provider });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCarrierProviderStats = async (req, res) => {
  try {
    const stats = await CarrierProviderService.getStats(req.params.id);
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getCarrierProviders,
  getCarrierProviderById,
  createCarrierProvider,
  updateCarrierProvider,
  toggleCarrierActive,
  deleteCarrierProvider,
  getCarrierProviderStats,
};
