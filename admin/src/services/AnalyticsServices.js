import requests from "./httpService";

const AnalyticsServices = {
  getDashboard: async (params) => {
    return requests.get("/analytics/dashboard", params);
  },
  getSales: async (params) => {
    return requests.get("/analytics/sales", params);
  },
  getOrders: async (params) => {
    return requests.get("/analytics/orders", params);
  },
  getCustomers: async (params) => {
    return requests.get("/analytics/customers", params);
  },
  getProducts: async (params) => {
    return requests.get("/analytics/products", params);
  },
  getCategories: async (params) => {
    return requests.get("/analytics/categories", params);
  },
  getCoupons: async (params) => {
    return requests.get("/analytics/coupons", params);
  },
  getInventory: async () => {
    return requests.get("/analytics/inventory");
  },
  getRevenue: async (params) => {
    return requests.get("/analytics/revenue", params);
  },
  // Returns the raw file (Blob)  the caller is responsible for triggering
  // the browser download (see ExportMenu.jsx's downloadBlob).
  //
  // With responseType "blob", axios also blob-ifies error response bodies 
  // a 400/501 JSON error from the export endpoint arrives as an unparsed
  // Blob, not the { message } object every other service's error handling
  // expects. Normalized here so callers can keep using their usual
  // `err?.response?.data?.message` pattern.
  exportReport: async (format, reportType, params = {}) => {
    try {
      return await requests.getBlob("/analytics/export", { ...params, format, reportType });
    } catch (err) {
      const blobBody = err?.response?.data;
      if (blobBody instanceof Blob && blobBody.type?.includes("json")) {
        try {
          err.response.data = JSON.parse(await blobBody.text());
        } catch {
          // Not valid JSON after all  leave the raw blob in place.
        }
      }
      throw err;
    }
  },
};

export default AnalyticsServices;
