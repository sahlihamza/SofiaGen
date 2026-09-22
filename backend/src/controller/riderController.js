const riderService = require("../service/riderService");
const { resolveStoreId } = require("../utils/requestContext");
const { publicPath } = require("../utils/uploadPaths");

const getRiders = async (req, res) => {
  try {
    const { search, status, availability, page, limit } = req.query;
    const { riders, totalDoc, limits, pages } = await riderService.getAllRiders({
      search,
      status,
      availability,
      page,
      limit,
      storeId: resolveStoreId(req),
    });
    return res.status(200).json({
      success: true,
      message: "Liste des livreurs récupéré avec succès",
      data: riders,
      totalDoc,
      limits,
      pages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getRiderStats = async (req, res) => {
  try {
    const stats = await riderService.getStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getRiderById = async (req, res) => {
  try {
    const storeId = resolveStoreId(req);
    const { id } = req.params;
    const rider = await riderService.getRiderById(id, storeId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Livreur introuvable",
      });
    }

    return res.status(200).json({
      success: true,
      data: rider,
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

const getRiderOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await riderService.getRiderById(id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Livreur introuvable",
      });
    }

    const { search, page, limit } = req.query;
    const { orders, totalDoc, limits, pages } = await riderService.getRiderOrders({
      riderId: id,
      search,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: orders,
      totalDoc,
      limits,
      pages,
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

const addRider = async (req, res) => {
  try {
    const { name, email, password, phone, address, city, country, vehicleType, vehicleNumber } = req.body;
    const image = req.file
      ? publicPath("riderImages", req.file.filename)
      : req.body.image || null;

    const exists = await riderService.riderExists({ email });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Cet email est déjà utilisé",
      });
    }

    const rider = await riderService.addRider({
      name,
      email,
      password,
      phone,
      address,
      city,
      country,
      vehicleType,
      vehicleNumber,
      image,
      storeId: resolveStoreId(req),
    });

    return res.status(201).json({
      success: true,
      message: "Livreur ajouté avec succès",
      data: rider,
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
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Cet email est déjà utilisé",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const updateRider = async (req, res) => {
  try {
    const { id } = req.params;
    const currentRider = await riderService.getRiderById(id);

    if (!currentRider) {
      return res.status(404).json({
        success: false,
        message: "Livreur introuvable",
      });
    }

    const emailTaken = await riderService.riderExists({
      email: req.body.email,
      _id: { $ne: id },
    });

    if (emailTaken) {
      return res.status(409).json({
        success: false,
        message: "Cet email est déjà utilisé",
      });
    }

    const updatedRider = await riderService.updateRider(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Livreur mis à jour avec succès",
      data: updatedRider,
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

const deleteRider = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await riderService.getRiderById(id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Livreur introuvable",
      });
    }

    await riderService.deleteRider(id);

    return res.status(200).json({
      success: true,
      message: "Livreur supprimé avec succès",
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

const updateRiderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await riderService.toggleRiderStatus(id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Livreur introuvable",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Statut mis à jour avec succès",
      data: { id: rider._id, status: rider.status },
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

module.exports = {
  getRiders,
  getRiderStats,
  getRiderById,
  getRiderOrders,
  addRider,
  updateRider,
  deleteRider,
  updateRiderStatus,
};