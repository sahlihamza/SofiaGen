const PlatformDashboardService = require("../service/PlatformDashboardService");

const getSuperAdminDashboard = async (req, res) => {
  try {
    const data = await PlatformDashboardService.getDashboard();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getSuperAdminDashboard };
