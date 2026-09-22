import requests from "../httpService";

const API_PREFIX = "/v1/platform/logs";

const logsAPI = {
  getDashboardStats: async (params = {}) => requests.get(`${API_PREFIX}/dashboard`, params),
  getSystemLogs: async (params = {}) => requests.get(`${API_PREFIX}/system`, params),
  getSecurityLogs: async (params = {}) => requests.get(`${API_PREFIX}/security`, params),
  getWebhookLogs: async (params = {}) => requests.get(`${API_PREFIX}/webhooks`, params),
  retryWebhook: async (id) => requests.post(`${API_PREFIX}/webhooks/${id}/retry`, {}),
  getJobLogs: async (params = {}) => requests.get(`${API_PREFIX}/jobs`, params),
};

export default logsAPI;
