import requests from "../httpService";

const API_PREFIX = "/v1/platform/audit-logs";

const auditAPI = {
  getAuditLogs: async (params = {}) => {
    return requests.get(API_PREFIX, params);
  },

  getAuditLogById: async (id) => {
    return requests.get(`${API_PREFIX}/${id}`);
  },

  getUserActivityLog: async (userId) => {
    return requests.get(`${API_PREFIX}/by-user/${userId}`);
  },

  getResourceAuditLog: async (resourceType, resourceId) => {
    return requests.get(
      `${API_PREFIX}/by-resource/${resourceType}/${resourceId}`
    );
  },

  exportAuditLogs: async (params = {}) => {
    return requests.post(`${API_PREFIX}/export`, params);
  },

  // AUDIT-EXPORT-1: background export for large result sets  request,
  // poll status, download once ready.
  requestAsyncExport: async (params = {}) => {
    return requests.post(`${API_PREFIX}/exports`, params);
  },

  getExportStatus: async (jobId) => {
    return requests.get(`${API_PREFIX}/exports/${jobId}`);
  },

  downloadExport: async (jobId) => {
    return requests.getBlob(`${API_PREFIX}/exports/${jobId}/download`);
  },

  cleanupOldLogs: async (days = 365) => {
    return requests.delete(`${API_PREFIX}/cleanup?days=${days}`);
  },

  getAuditStats: async (params = {}) => {
    return requests.get(`${API_PREFIX}/stats`, params);
  },
};

export default auditAPI;