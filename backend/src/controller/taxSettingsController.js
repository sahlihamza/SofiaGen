const taxSettingsService = require("../service/taxSettingsService");

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
    const settings = await taxSettingsService.getByStoreId(storeId);

    return res.status(200).json({
      success: true,
      message: "Paramètres fiscaux récupérés avec succès",
      data: settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateOptions = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await taxSettingsService.upsertOptions(storeId, req.body, req.user);

    return res.status(200).json({
      success: true,
      message: "Options fiscales mises  jour avec succès",
      data: settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateTaxClasses = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { classes } = req.body;
    const settings = await taxSettingsService.upsertTaxClasses(
      storeId,
      classes,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Classes de taxe mises  jour avec succès",
      data: settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateRates = async (req, res) => {
  try {
    const { storeId, taxClass } = req.params;
    const { rates } = req.body;
    const settings = await taxSettingsService.replaceRates(
      storeId,
      taxClass,
      rates,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Taux d'imposition mis à jour avec succès",
      data: settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getSettings,
  updateOptions,
  updateTaxClasses,
  updateRates,
};
