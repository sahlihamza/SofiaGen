const generalSettingsService = require("../service/generalSettingsService");

const getGeneralSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    let settings = await generalSettingsService.getByStoreId(storeId);

    if (!settings) {
      settings = await generalSettingsService.provisionDefaults(storeId);
    }

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Paramètres généraux introuvables pour cette boutique",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Paramètres généraux récupérés avec succès",
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

const updateGeneralSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await generalSettingsService.upsertByStoreId(storeId, req.body);

    return res.status(200).json({
      success: true,
      message: "Paramètres généraux mis à jour avec succès",
      data: settings,
    });
  } catch (error) {
    if (error.name === "DuplicateStoreName") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

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
  getGeneralSettings,
  updateGeneralSettings,
};
