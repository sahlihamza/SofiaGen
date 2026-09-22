const supportTicketService = require("../service/supportTicketService");
const supportAnalyticsService = require("../service/supportAnalyticsService");
const { getActiveStoreId } = require("../utils/getActiveStore");

const resolvePlatformStoreId = (req) => {
  if (req.user?.isSuperAdmin) {
    return req.query.storeId || null;
  }
  return req.query.storeId || getActiveStoreId();
};

const handleError = (res, error) => {
  if (error.code === "NO_ACTIVE_STORE") {
    return res.status(409).json({ success: false, message: error.message });
  }
  if (error.name === "CastError" || error.name === "BSONError") {
    return res.status(400).json({ success: false, message: "Paramètre de filtre invalide" });
  }
  return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
};

const getPlatformTickets = async (req, res) => {
  try {
    const storeId = await resolvePlatformStoreId(req);
    const {
      page,
      limit,
      status,
      priority,
      categoryId,
      assigneeId,
      dateFrom,
      dateTo,
      sortBy,
      search,
      slaStatus,
    } = req.query;

    const { tickets, totalDoc, limits, pages } = await supportTicketService.getAllTickets({
      storeId,
      page,
      limit,
      status,
      priority,
      categoryId,
      assigneeId,
      dateFrom,
      dateTo,
      sortBy,
      search,
    });

    let filteredTickets = tickets;
    if (slaStatus) {
      filteredTickets = tickets.filter((t) => t.slaStatus === slaStatus);
    }

    return res.status(200).json({
      success: true,
      data: filteredTickets,
      totalDoc,
      limits,
      pages,
      scope: storeId ? "store" : "platform",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPlatformAnalytics = async (req, res) => {
  try {
    const storeId = await resolvePlatformStoreId(req);
    const { startDate, endDate, comparePeriod } = req.query;

    const summary = await supportAnalyticsService.getSupportSummary({
      storeId,
      startDate,
      endDate,
      comparePeriod: comparePeriod === "true" || comparePeriod === true,
    });

    return res.status(200).json({
      success: true,
      data: summary,
      scope: storeId ? "store" : "platform",
    });
  } catch (error) {
    if (error.code === "INVALID_DATE_RANGE") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return handleError(res, error);
  }
};

module.exports = { getPlatformTickets, getPlatformAnalytics };
