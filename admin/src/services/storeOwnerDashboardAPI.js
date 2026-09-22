import requests from "./httpService";

const storeOwnerDashboardAPI = {
  getDashboard: async () => requests.get("/dashboard/store-owner"),
  getDashboardV2: async (params = {}) => requests.get("/dashboard/store-owner/v2", { params }),
  getWidget: async (widget, params = {}) => requests.get(`/dashboard/store-owner/v2/widget/${widget}`, { params }),
  refresh: async () => requests.post("/dashboard/store-owner/v2/refresh"),
};

export default storeOwnerDashboardAPI;
