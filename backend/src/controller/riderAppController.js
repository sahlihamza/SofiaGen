const riderService = require("../service/riderService");

// All handlers use req.rider (set by the loadRider middleware) rather than
// any client-supplied id  a rider must never be able to read another
// rider's stats or orders by tampering with a URL/body parameter.

const getMyStats = async (req, res) => {
  try {
    const stats = await riderService.getDashboardStats(req.rider._id);
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

const getMyOrders = async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;
    const { orders, totalDoc, limits, pages } = await riderService.getRiderOrders({
      riderId: req.rider._id,
      search,
      status,
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
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const updateMyAvailability = async (req, res) => {
  try {
    const rider = await riderService.toggleAvailability(req.rider._id);
    return res.status(200).json({
      success: true,
      message: "Disponibilité mise  jour avec succès",
      data: { availability: rider.availability },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

module.exports = {
  getMyStats,
  getMyOrders,
  updateMyAvailability,
};
