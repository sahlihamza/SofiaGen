const StoreCarrierProviderService = require('../service/shipping/StoreCarrierProviderService');
const { hasStoreAccess } = require('../middleware/auth');

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
  if (error.message && (error.message.includes('inactive carrier') || error.message.includes('not found'))) {
    return res.status(400).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
};

const getStoreCarriers = async (req, res) => {
  try {
    const { storeId } = req.params;

    // Verify store access
    const hasAccess = await hasStoreAccess(req.user, storeId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Accès refusé  ce store' });
    }

    const carriers = await StoreCarrierProviderService.getStoreCarriers(storeId);
    return res.status(200).json({ success: true, data: carriers });
  } catch (error) {
    return handleError(res, error);
  }
};

const connectCarrier = async (req, res) => {
  try {
    const { storeId, carrierProviderId } = req.params;
    const { credentials } = req.body;

    // Verify store access
    const hasAccess = await hasStoreAccess(req.user, storeId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Accès refusé  ce store' });
    }

    if (!credentials || typeof credentials !== 'object') {
      return res.status(422).json({
        success: false,
        message: 'Credentials must be provided as an object',
      });
    }

    const storeCarrier = await StoreCarrierProviderService.connectCarrier(
      storeId,
      carrierProviderId,
      credentials,
      req.user?._id
    );

    return res.status(201).json({
      success: true,
      message: 'Carrier connected to store',
      data: storeCarrier,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const disconnectCarrier = async (req, res) => {
  try {
    const { storeId, carrierProviderId } = req.params;

    // Verify store access
    const hasAccess = await hasStoreAccess(req.user, storeId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Accès refusé  ce store' });
    }

    const storeCarrier = await StoreCarrierProviderService.disconnectCarrier(
      storeId,
      carrierProviderId,
      req.user?._id
    );

    return res.status(200).json({
      success: true,
      message: 'Carrier disconnected from store',
      data: storeCarrier,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCarrierCapabilities = async (req, res) => {
  try {
    const { storeId, carrierProviderId } = req.params;
    const { hasLabelGeneration, hasTracking } = req.body;

    // Verify store access
    const hasAccess = await hasStoreAccess(req.user, storeId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Accès refusé  ce store' });
    }

    const storeCarrier = await StoreCarrierProviderService.updateCapabilities(
      storeId,
      carrierProviderId,
      { hasLabelGeneration, hasTracking },
      req.user?._id
    );

    return res.status(200).json({
      success: true,
      message: 'Carrier capabilities updated',
      data: storeCarrier,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getStoreCarriers,
  connectCarrier,
  disconnectCarrier,
  updateCarrierCapabilities,
};
