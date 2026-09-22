const StoreOwnerDashboardService = require("../service/StoreOwnerDashboardService");

const getStoreOwnerDashboard = async (req, res) => {
  try {
    const payload = await StoreOwnerDashboardService.getDashboardPayload(req);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStoreOwnerDashboard };
