const analyticsService = require("../service/analyticsService");
const analyticsExportService = require("../service/analyticsExportService");
const { getActiveStoreId } = require("../utils/getActiveStore");

// Maps an export's reportType query param to the analyticsService method
// that produces the data for it  every export reuses the exact same
// computation the corresponding dashboard section already renders, nothing
// is recalculated for export purposes.
const EXPORT_REPORT_METHODS = {
  dashboard: "getDashboardOverview",
  sales: "getSalesAnalytics",
  orders: "getOrdersAnalytics",
  customers: "getCustomersAnalytics",
  products: "getProductsAnalytics",
  categories: "getCategoriesAnalytics",
  coupons: "getCouponsAnalytics",
  revenue: "getRevenueReport",
};

const getDashboard = async (req, res) => {
  try {
    const { period, startDate, endDate, comparePeriod, timezone } = req.query;
    const storeId = req.currentStoreId || (await getActiveStoreId());

    const overview = await analyticsService.getDashboardOverview({
      storeId,
      period,
      startDate,
      endDate,
      comparePeriod,
      timezone,
    });

    return res.status(200).json({ success: true, data: overview });
  } catch (error) {
    if (error.code === "INVALID_DATE_RANGE" || error.code === "STORE_ID_REQUIRED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getSales = async (req, res) => {
  try {
    const { period, startDate, endDate, comparePeriod, timezone, interval } = req.query;
    const storeId = req.currentStoreId || (await getActiveStoreId());

    const sales = await analyticsService.getSalesAnalytics({
      storeId,
      period,
      startDate,
      endDate,
      comparePeriod,
      timezone,
      interval,
    });

    return res.status(200).json({ success: true, data: sales });
  } catch (error) {
    if (
      error.code === "INVALID_DATE_RANGE" ||
      error.code === "STORE_ID_REQUIRED" ||
      error.code === "INVALID_INTERVAL"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const { period, startDate, endDate, comparePeriod, timezone } = req.query;
    const storeId = req.currentStoreId || (await getActiveStoreId());

    const orders = await analyticsService.getOrdersAnalytics({
      storeId,
      period,
      startDate,
      endDate,
      comparePeriod,
      timezone,
    });

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    if (error.code === "INVALID_DATE_RANGE" || error.code === "STORE_ID_REQUIRED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const { period, startDate, endDate, comparePeriod, timezone } = req.query;
    const storeId = req.currentStoreId || (await getActiveStoreId());

    const customers = await analyticsService.getCustomersAnalytics({
      storeId,
      period,
      startDate,
      endDate,
      comparePeriod,
      timezone,
    });

    return res.status(200).json({ success: true, data: customers });
  } catch (error) {
    if (error.code === "INVALID_DATE_RANGE" || error.code === "STORE_ID_REQUIRED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const { period, startDate, endDate, comparePeriod, timezone, category, brand } = req.query;
    const storeId = req.currentStoreId || (await getActiveStoreId());

    const products = await analyticsService.getProductsAnalytics({
      storeId,
      period,
      startDate,
      endDate,
      comparePeriod,
      timezone,
      category,
      brand,
    });

    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    if (error.code === "INVALID_DATE_RANGE" || error.code === "STORE_ID_REQUIRED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const { period, startDate, endDate, comparePeriod, timezone } = req.query;
    const storeId = req.currentStoreId || (await getActiveStoreId());

    const categories = await analyticsService.getCategoriesAnalytics({
      storeId,
      period,
      startDate,
      endDate,
      comparePeriod,
      timezone,
    });

    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    if (error.code === "INVALID_DATE_RANGE" || error.code === "STORE_ID_REQUIRED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getCoupons = async (req, res) => {
  try {
    const { period, startDate, endDate, comparePeriod, timezone } = req.query;
    const storeId = req.currentStoreId || (await getActiveStoreId());

    const coupons = await analyticsService.getCouponsAnalytics({
      storeId,
      period,
      startDate,
      endDate,
      comparePeriod,
      timezone,
    });

    return res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    if (error.code === "INVALID_DATE_RANGE" || error.code === "STORE_ID_REQUIRED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getInventory = async (req, res) => {
  try {
    const storeId = req.currentStoreId || (await getActiveStoreId());

    const inventory = await analyticsService.getInventoryAnalytics({ storeId });

    return res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    if (error.code === "STORE_ID_REQUIRED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getRevenue = async (req, res) => {
  try {
    const { period, startDate, endDate, comparePeriod, timezone } = req.query;
    const storeId = req.currentStoreId || (await getActiveStoreId());

    const revenue = await analyticsService.getRevenueReport({
      storeId,
      period,
      startDate,
      endDate,
      comparePeriod,
      timezone,
    });

    return res.status(200).json({ success: true, data: revenue });
  } catch (error) {
    if (error.code === "INVALID_DATE_RANGE" || error.code === "STORE_ID_REQUIRED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getExport = async (req, res) => {
  try {
    const { format = "csv", reportType, period, startDate, endDate, comparePeriod, timezone } = req.query;

    const methodName = EXPORT_REPORT_METHODS[reportType];
    if (!methodName) {
      return res.status(400).json({
        success: false,
        message: `reportType invalide : ${reportType} (valeurs acceptés : ${Object.keys(EXPORT_REPORT_METHODS).join(", ")})`,
      });
    }

    const storeId = req.currentStoreId || (await getActiveStoreId());
    const data = await analyticsService[methodName]({ storeId, period, startDate, endDate, comparePeriod, timezone });

    if (format === "csv") {
      const csv = analyticsExportService.buildCsvExport(reportType, data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="analytics-${reportType}.csv"`);
      return res.status(200).send(csv);
    }

    if (format === "pdf") {
      const pdfBuffer = await analyticsExportService.buildPdfExport(reportType, data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="analytics-${reportType}.pdf"`);
      return res.status(200).send(pdfBuffer);
    }

    if (format === "excel") {
      // No xlsx/exceljs (or any spreadsheet-writing library) exists anywhere
      // in this project today  checked package.json before writing this.
      // Adding one is a real dependency decision, not something to slip in
      // silently under an unrelated ticket, so this is left unimplemented
      // rather than faking an .xlsx by renaming a CSV. CSV and PDF cover the
      // same data in the meantime.
      return res.status(501).json({
        success: false,
        message:
          "Export Excel non implémenté (aucune librairie xlsx dans le projet  décision de dépendance  valider séparément). CSV et PDF sont disponibles dés maintenant.",
      });
    }

    return res.status(400).json({ success: false, message: `format invalide : ${format} (csv, pdf, excel)` });
  } catch (error) {
    if (
      error.code === "INVALID_DATE_RANGE" ||
      error.code === "STORE_ID_REQUIRED" ||
      error.code === "INVALID_REPORT_TYPE"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getDashboard,
  getSales,
  getOrders,
  getCustomers,
  getProducts,
  getCategories,
  getCoupons,
  getInventory,
  getRevenue,
  getExport,
};

