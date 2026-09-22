const supportAnalyticsService = require("../service/supportAnalyticsService");
const { getActiveStoreId } = require("../utils/getActiveStore");

// SUPPORT-9: same isSuperAdmin-driven scoping used throughout auth.js  a
// super admin can inspect one store (?storeId=...) or leave it out to
// aggregate across every store; a store-level user always gets strictly
// filtered to their own active store, storeId is never optional for them.
const resolveAnalyticsStoreId = async (req) => {
  if (req.user?.isSuperAdmin) {
    return req.query.storeId || null;
  }
  return req.query.storeId || (await getActiveStoreId());
};

const handleAnalyticsError = (res, error) => {
  if (error.code === "INVALID_DATE_RANGE") {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.code === "NO_ACTIVE_STORE") {
    return res.status(409).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
};

const getSupportSummary = async (req, res) => {
  try {
    const storeId = await resolveAnalyticsStoreId(req);
    const { startDate, endDate, comparePeriod } = req.query;

    const summary = await supportAnalyticsService.getSupportSummary({
      storeId,
      startDate,
      endDate,
      comparePeriod: comparePeriod === "true" || comparePeriod === true,
    });

    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    return handleAnalyticsError(res, error);
  }
};

const getSupportCsat = async (req, res) => {
  try {
    const storeId = await resolveAnalyticsStoreId(req);
    const { startDate, endDate } = req.query;

    const csat = await supportAnalyticsService.getSupportCsat({ storeId, startDate, endDate });

    return res.status(200).json({ success: true, data: csat });
  } catch (error) {
    return handleAnalyticsError(res, error);
  }
};

const getAgentPerformance = async (req, res) => {
  try {
    const storeId = await resolveAnalyticsStoreId(req);
    const { startDate, endDate } = req.query;

    const performance = await supportAnalyticsService.getAgentPerformance({ storeId, startDate, endDate });

    return res.status(200).json({ success: true, data: performance });
  } catch (error) {
    return handleAnalyticsError(res, error);
  }
};

module.exports = { getSupportSummary, getSupportCsat, getAgentPerformance };
