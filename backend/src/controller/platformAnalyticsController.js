const AnalyticsService = require("../service/analyticsService");
const AuditService = require("../service/AuditService");

const getDashboardMetrics = async (req, res) => {
  try {
    const metrics = await AnalyticsService.getDashboardMetrics();

    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getRevenueAnalytics = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const data = await AnalyticsService.getRevenueAnalytics(months);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getSubscriptionAnalytics = async (req, res) => {
  try {
    const data = await AnalyticsService.getSubscriptionAnalytics();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getUserAnalytics = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const data = await AnalyticsService.getUserAnalytics(months);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getChurnAnalytics = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const data = await AnalyticsService.getChurnAnalytics(months);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getTrialsAnalytics = async (req, res) => {
  try {
    const data = await AnalyticsService.getTrialsAnalytics();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getPaymentsAnalytics = async (req, res) => {
  try {
    const data = await AnalyticsService.getPaymentsAnalytics();

    return res.status(200).json({
      success: true,
      data,
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
  getDashboardMetrics,
  getRevenueAnalytics,
  getSubscriptionAnalytics,
  getUserAnalytics,
  getChurnAnalytics,
  getTrialsAnalytics,
  getPaymentsAnalytics,
};
