const shippingSettingsService = require("../service/shippingSettingsService");

const getShippingSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await shippingSettingsService.getByStoreId(storeId);

    return res.status(200).json({
      success: true,
      message: "Réglages de livraison récupérés avec succès",
      data: settings,
    });
  } catch (error) {
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
  }
};

const updateShippingSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await shippingSettingsService.upsertByStoreId(storeId, req.body);

    return res.status(200).json({
      success: true,
      message: "Réglages de livraison mis à jour avec succès",
      data: settings,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
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
  }
};

module.exports = {
  getShippingSettings,
  updateShippingSettings,
};
