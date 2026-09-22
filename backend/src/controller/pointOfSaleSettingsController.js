const pointOfSaleSettingsService = require("../service/pointOfSaleSettingsService");

const handleError = (res, error) => {
  if (error.name === "ValidationError") {
    const errors = error.errors
      ? Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
        }))
      : [];
    return res.status(422).json({
      success: false,
      message: error.message || "Donnés invalides",
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

const getSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await pointOfSaleSettingsService.getByStoreId(storeId);

    return res.status(200).json({
      success: true,
      message: "Paramètres du point de vente récupérés avec succès",
      data: settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await pointOfSaleSettingsService.upsertByStoreId(
      storeId,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Paramètres du point de vente mis à jour avec succès",
      data: settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
