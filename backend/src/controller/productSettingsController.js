const productSettingsService = require("../service/productSettingsService");

const getProductSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await productSettingsService.getByStoreId(storeId);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Paramètres produits introuvables pour cette boutique",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Paramètres produits récupérés avec succès",
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

const updateProductSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await productSettingsService.upsertByStoreId(storeId, req.body);

    return res.status(200).json({
      success: true,
      message: "Paramètres produits mis à jour avec succès",
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
  getProductSettings,
  updateProductSettings,
};
