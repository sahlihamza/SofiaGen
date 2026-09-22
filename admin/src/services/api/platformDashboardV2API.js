import requests from "../httpService";

const API_PREFIX = "/v1/platform/dashboard-v2";

const platformDashboardV2API = {
  // Full aggregated dashboard (all sections in one call)
  getFullDashboard: async () => {
    return requests.get(`${API_PREFIX}/full`);
  },

  // Dedicated per-section analytics endpoints
  getKPIs: async () => {
    return requests.get(`${API_PREFIX}/kpi`);
  },
  getRevenueAnalytics: async (params = {}) => {
    return requests.get(`${API_PREFIX}/revenue`, { params });
  },
  getStoreAnalytics: async (params = {}) => {
    return requests.get(`${API_PREFIX}/stores`, { params });
  },
  getSubscriptionAnalytics: async (params = {}) => {
    return requests.get(`${API_PREFIX}/subscriptions`, { params });
  },
  getPaymentAnalytics: async (params = {}) => {
    return requests.get(`${API_PREFIX}/payments`, { params });
  },
  getFinancialAnalytics: async () => {
    return requests.get(`${API_PREFIX}/financial`);
  },
  getAdvancedMetrics: async () => {
    return requests.get(`${API_PREFIX}/advanced-metrics`);
  },
  getTopStores: async (params = {}) => {
    return requests.get(`${API_PREFIX}/top-stores`, { params });
  },
  getRecentActivity: async (params = {}) => {
    return requests.get(`${API_PREFIX}/activities`, { params });
  },
  getAlerts: async () => {
    return requests.get(`${API_PREFIX}/alerts`);
  },
  getGeographicAnalytics: async () => {
    return requests.get(`${API_PREFIX}/geographic`);
  },
  getProvidersAnalytics: async () => {
    return requests.get(`${API_PREFIX}/providers`);
  },
  getUsageAnalytics: async () => {
    return requests.get(`${API_PREFIX}/usage`);
  },
  getPlatformHealth: async () => {
    return requests.get(`${API_PREFIX}/health`);
  },
  getInfrastructure: async () => {
    return requests.get(`${API_PREFIX}/infrastructure`);
  },
  getRiskAnalysis: async () => {
    return requests.get(`${API_PREFIX}/risk`);
  },
};

export default platformDashboardV2API;
