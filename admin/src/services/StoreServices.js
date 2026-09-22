import requests from "@/services/httpService";

const StoreServices = {
  getAllStores: async () => {
    return requests.get("/stores");
  },

  getStoreById: async (id) => {
    return requests.get(`/stores/${id}`);
  },

  getStoreDomains: async (id) => {
    return requests.get(`/stores/${id}/domains`);
  },

  addStore: async (body) => {
    return requests.post("/stores", body);
  },

  updateStore: async (id, body) => {
    return requests.put(`/stores/${id}`, body);
  },

  checkStoreName: async (name) => {
    return requests.get(`/stores/check-name?name=${encodeURIComponent(name)}`);
  },

  checkStoreSubdomain: async (subdomain) => {
    return requests.get(`/stores/check-subdomain?subdomain=${encodeURIComponent(subdomain)}`);
  },

  updateStoreStatus: async (id, isActive) => {
    return requests.put(`/stores/${id}/status`, { isActive });
  },

  deleteStore: async (id) => {
    return requests.delete(`/stores/${id}`);
  },

  restoreStore: async (id) => {
    return requests.post(`/stores/${id}/restore`);
  },

  // Store-switch lives in UserServices.selectMyStore (PATCH /user/stores/select)
  // + StoreContext.selectStore, not here  this comment used to claim the
  // endpoint was deleted, which was never true, it's just defined elsewhere.

  updateStoreSettings: async (id, body) => {
    return requests.put(`/stores/${id}/settings`, body);
  },
  duplicateStore: async (id) => {
    return requests.post(`/stores/${id}/duplicate`);
  },

  getStoreAnalytics: async (id, params = {}) => {
    return requests.get(`/stores/${id}/analytics`, params);
  },

  getStoreApiKeys: async (id) => {
    return requests.get(`/stores/${id}/api-keys`);
  },

  getStoreWebhooks: async (id) => {
    return requests.get(`/stores/${id}/webhooks`);
  },

  getStoreBackups: async (id) => {
    return requests.get(`/stores/${id}/backups`);
  },

  getStoreLogs: async (id, params = {}) => {
    return requests.get(`/stores/${id}/logs`, params);
  },

  getStoreSystemLogs: async (id, params = {}) => {
    return requests.get(`/stores/${id}/system-logs`, params);
  },

  getStoreSecurity: async (id) => {
    return requests.get(`/stores/${id}/security`);
  },

  getStoreMaintenance: async (id) => {
    return requests.get(`/stores/${id}/maintenance`);
  },

  impersonateStoreOwner: async (ownerId) => {
    return requests.post(`/v1/platform/users/${ownerId}/impersonate`);
  },

  createStoreBackup: async (id, body = {}) => {
    return requests.post(`/stores/${id}/backups`, body);
  },

  verifyStoreBackup: async (id, jobId) => {
    return requests.post(`/stores/${id}/backups/${jobId}/verify`);
  },

  downloadStoreBackup: async (id, jobId) => {
    return requests.getBlob(`/stores/${id}/backups/${jobId}/download`);
  },

  deleteStoreBackup: async (id, jobId) => {
    return requests.delete(`/stores/${id}/backups/${jobId}`);
  },

  restoreStoreBackup: async (id, jobId) => {
    return requests.post(`/stores/${id}/backups/${jobId}/restore`);
  },

  updateStoreOwner: async (id, ownerId) => {
    return requests.put(`/stores/${id}/owner`, { ownerId });
  },

  exportStoreLogs: async (id, params = {}) => {
    return requests.getBlob(`/stores/${id}/logs/export`, params);
  },

  updateStoreSettings: async (id, group, body) => {
    return requests.put(`/stores/${id}/settings/${group}`, body);
  },

  updateStoreSettingsLegacy: async (id, body) => {
    return requests.put(`/stores/${id}/settings`, body);
  },

  requestAuditExport: async (body) => {
    return requests.post("/v1/platform/audit-logs/exports", body);
  },

  getAuditExportStatus: async (jobId) => {
    return requests.get(`/v1/platform/audit-logs/exports/${jobId}`);
  },

  downloadAuditExport: async (jobId) => {
    return requests.getBlob(`/v1/platform/audit-logs/exports/${jobId}/download`);
  },

  addStoreAdmin: async (id, body) => {
    return requests.post(`/stores/${id}/admins`, body);
  },

  getStoreRoles: async (id) => {
    return requests.get(`/stores/${id}/roles`);
  },

  updateStoreStaffRole: async (id, userId, roleId) => {
    return requests.put(`/stores/${id}/staff/${userId}/role`, { roleId });
  },

  updateStoreStaffStatus: async (id, userId, status) => {
    return requests.patch(`/stores/${id}/staff/${userId}/status`, { status });
  },

  removeStoreStaff: async (id, userId) => {
    return requests.delete(`/stores/${id}/staff/${userId}`);
  },

  // --- Store invitations (real pending -> email -> accept flow) ---
  getStoreInvitations: async (id, params) => {
    return requests.get(`/stores/${id}/invitations`, params);
  },

  createStoreInvitation: async (id, body) => {
    return requests.post(`/stores/${id}/invitations`, body);
  },

  resendStoreInvitation: async (id, invId) => {
    return requests.post(`/stores/${id}/invitations/${invId}/resend`);
  },

  revokeStoreInvitation: async (id, invId) => {
    return requests.post(`/stores/${id}/invitations/${invId}/revoke`);
  },

  // --- Store teams ---
  getStoreTeams: async (id, params) => {
    return requests.get(`/stores/${id}/teams`, params);
  },

  createStoreTeam: async (id, body) => {
    return requests.post(`/stores/${id}/teams`, body);
  },

  updateStoreTeam: async (id, teamId, body) => {
    return requests.put(`/stores/${id}/teams/${teamId}`, body);
  },

  deleteStoreTeam: async (id, teamId) => {
    return requests.delete(`/stores/${id}/teams/${teamId}`);
  },

  addStoreTeamMember: async (id, teamId, userId) => {
    return requests.post(`/stores/${id}/teams/${teamId}/members`, { userId });
  },

  removeStoreTeamMember: async (id, teamId, userId) => {
    return requests.delete(`/stores/${id}/teams/${teamId}/members/${userId}`);
  },

  verifyStoreDomain: async (id, domainId) => {
    return requests.post(`/stores/${id}/domains/${domainId}/verify`);
  },

  getStoreMaintenance: async (id) => {
    return requests.get(`/stores/${id}/maintenance`);
  },

  updateStoreMaintenance: async (id, body) => {
    return requests.put(`/stores/${id}/maintenance`, body);
  },

  createStoreApiKey: async (id, body) => {
    return requests.post(`/stores/${id}/api-keys`, body);
  },

  regenerateStoreApiKey: async (id, keyId) => {
    return requests.post(`/stores/${id}/api-keys/${keyId}/regenerate`);
  },

  revokeStoreApiKey: async (id, keyId) => {
    return requests.post(`/stores/${id}/api-keys/${keyId}/revoke`);
  },

  setStoreApiKeyExpiry: async (id, keyId, expiresAt) => {
    return requests.patch(`/stores/${id}/api-keys/${keyId}/expiry`, { expiresAt });
  },

  createStoreWebhook: async (id, body) => {
    return requests.post(`/stores/${id}/webhooks`, body);
  },

  testStoreWebhook: async (id, webhookId) => {
    return requests.post(`/stores/${id}/webhooks/${webhookId}/test`);
  },

  setStoreWebhookStatus: async (id, webhookId, status) => {
    return requests.post(`/stores/${id}/webhooks/${webhookId}/status`, { status });
  },

  rotateStoreWebhookSecret: async (id, webhookId) => {
    return requests.post(`/stores/${id}/webhooks/${webhookId}/rotate-secret`);
  },

  getStoreWebhookDeliveries: async (id, webhookId) => {
    return requests.get(`/stores/${id}/webhooks/${webhookId}/deliveries`);
  },

  retryStoreWebhookDelivery: async (id, webhookId, deliveryId) => {
    return requests.post(`/stores/${id}/webhooks/${webhookId}/deliveries/${deliveryId}/retry`);
  },

  deleteStoreWebhook: async (id, webhookId) => {
    return requests.delete(`/stores/${id}/webhooks/${webhookId}`);
  },

  createStoreDomain: async (storeId, body) => {
    return requests.post(`/stores/${storeId}/domains`, body);
  },

  updateStoreDomain: async (storeId, domainId, body) => {
    return requests.put(`/stores/${storeId}/domains/${domainId}`, body);
  },

  deleteStoreDomain: async (storeId, domainId) => {
    return requests.delete(`/stores/${storeId}/domains/${domainId}`);
  },

  platformListStores: async (params = {}) => {
    return requests.get("/v1/platform/stores", params);
  },

  platformGetStore: async (id) => {
    return requests.get(`/v1/platform/stores/${id}`);
  },

  platformUpdateStore: async (id, body) => {
    return requests.put(`/v1/platform/stores/${id}`, body);
  },

  platformTransferOwnership: async (id, newOwnerId) => {
    return requests.post(`/v1/platform/stores/${id}/transfer-ownership`, { newOwnerId });
  },
};

export default StoreServices;