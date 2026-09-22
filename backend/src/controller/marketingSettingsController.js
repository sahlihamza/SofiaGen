const marketingSettingsService = require("../service/marketingSettingsService");

const handleError = (res, error) => {
  const knownClientErrors = [
    "CapiDisabled",
    "Ga4Disabled",
    "MissingCapiConfig",
    "MissingGa4Config",
  ];
  if (knownClientErrors.includes(error.name)) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  if (error.name === "ValidationError") {
    const errors = error.errors
      ? Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
        }))
      : [];
    return res.status(422).json({
      success: false,
      message: "Donnés invalides",
      errors,
    });
  }
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Identifiant invalide",
    });
  }
  return res.status(500).json({
    success: false,
    message: "Erreur serveur",
    error: error.message,
  });
};

const getMarketingSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await marketingSettingsService.getByStoreId(storeId);
    const plain = settings.toObject();
    delete plain.meta?.capiAccessToken;
    return res.status(200).json({
      success: true,
      message: "Paramètres marketing récupérés avec succès",
      data: { ...plain, meta: { ...plain.meta, hasCapiToken: settings.hasCapiToken() } },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateMarketingSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await marketingSettingsService.upsertByStoreId(
      storeId,
      req.body || {},
      { actor: req.user, ipAddress: req.ip }
    );
    const plain = settings.toObject();
    delete plain.meta?.capiAccessToken;
    return res.status(200).json({
      success: true,
      message: "Paramètres marketing mis à jour avec succès",
      data: { ...plain, meta: { ...plain.meta, hasCapiToken: settings.hasCapiToken() } },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const testMetaConnection = async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await marketingSettingsService.testMetaConnection(storeId, {
      actor: req.user,
      ipAddress: req.ip,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const testGa4Connection = async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await marketingSettingsService.testGa4Connection(storeId, {
      actor: req.user,
      ipAddress: req.ip,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getMarketingSettings,
  updateMarketingSettings,
  testMetaConnection,
  testGa4Connection,
};