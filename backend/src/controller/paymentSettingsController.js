const paymentSettingsService = require("../service/paymentSettingsService");

const handleError = (res, error) => {
  if (
    error.name === "UnknownPaymentMethod" ||
    error.name === "DuplicatePaymentMethod" ||
    error.name === "InvalidReorder"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "PaymentMethodNotFound") {
    return res.status(404).json({
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

const getPaymentSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const settings = await paymentSettingsService.getByStoreId(storeId);

    return res.status(200).json({
      success: true,
      message: "Paramètres de paiement récupérés avec succès",
      data: settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePaymentSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { methods } = req.body;
    const settings = await paymentSettingsService.upsertByStoreId(storeId, methods);

    return res.status(200).json({
      success: true,
      message: "Paramètres de paiement mis à jour avec succès",
      data: settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const togglePaymentMethod = async (req, res) => {
  try {
    const { storeId, key } = req.params;
    const { enabled } = req.body;
    const settings = await paymentSettingsService.toggleMethod(storeId, key, !!enabled);

    return res.status(200).json({
      success: true,
      message: "Moyen de paiement mis à jour avec succès",
      data: settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const reorderPaymentMethods = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { orderedKeys } = req.body;
    const settings = await paymentSettingsService.reorderMethods(storeId, orderedKeys || []);

    return res.status(200).json({
      success: true,
      message: "Ordre des moyens de paiement mis à jour avec succès",
      data: settings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getPaymentSettings,
  updatePaymentSettings,
  togglePaymentMethod,
  reorderPaymentMethods,
};
