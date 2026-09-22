const gdprService = require("../service/gdprService");

const handleError = (res, error) => {
  if (error.name === "CustomerNotFound") {
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

const exportCustomerData = async (req, res) => {
  try {
    const { storeId } = req.params;
    const data = await gdprService.exportCustomerData(
      storeId,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Donnés client exportés avec succès",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteCustomerData = async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await gdprService.deleteCustomerData(
      storeId,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Donnés client supprimées avec succès",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const anonymizeCustomerData = async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await gdprService.anonymizeCustomerData(
      storeId,
      req.body,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Donnés client anonymisés avec succès",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const listRequests = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page, limit } = req.query;
    const result = await gdprService.listRequests(storeId, { page, limit });

    return res.status(200).json({
      success: true,
      message: "Demandes RGPD récupérés avec succès",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  exportCustomerData,
  deleteCustomerData,
  anonymizeCustomerData,
  listRequests,
};
