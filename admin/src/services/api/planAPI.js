import requests from "../httpService";

const API_PREFIX = "/v1/billing/plans";

const planAPI = {
  getAllPlans: async (params = {}) => {
    return requests.get(API_PREFIX, params);
  },

  getPlanById: async (id) => {
    return requests.get(`${API_PREFIX}/${id}`);
  },

  createPlan: async (body) => {
    return requests.post(API_PREFIX, body);
  },

  updatePlan: async (id, body) => {
    return requests.put(`${API_PREFIX}/${id}`, body);
  },

  deletePlan: async (id) => {
    return requests.delete(`${API_PREFIX}/${id}`);
  },

  clonePlan: async (id, body = {}) => {
    return requests.post(`${API_PREFIX}/${id}/clone`, body);
  },

  updatePlanStatus: async (id, status) => {
    return requests.patch(`${API_PREFIX}/${id}/status`, { status });
  },

  activatePlan: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/activate`);
  },

  deactivatePlan: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/deactivate`);
  },

  archivePlan: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/archive`);
  },

  assignPlanToStore: async (id, body) => {
    return requests.post(`${API_PREFIX}/${id}/assign`, body);
  },

  getPlanSubscriptions: async (id, params = {}) => {
    return requests.get(`${API_PREFIX}/${id}/subscriptions`, params);
  },

  getPlanSubscriptionsSummary: async (id) => {
    return requests.get(`${API_PREFIX}/${id}/subscriptions/summary`);
  },

  getPlanAffectedStores: async (id) => {
    return requests.get(`${API_PREFIX}/${id}/affected-stores`);
  },

  getPlanHistory: async (id) => {
    return requests.get(`${API_PREFIX}/${id}/history`);
  },

  getPlanAuditLog: async (id, params = {}) => {
    return requests.get(`${API_PREFIX}/${id}/audit-log`, params);
  },

  getPlanUsageStats: async (id) => {
    return requests.get(`${API_PREFIX}/usage-stats/${id}`);
  },

  upgradeSubscription: async (subscriptionId, body = {}) => {
    return requests.post(
      `${API_PREFIX}/subscriptions/${subscriptionId}/upgrade`,
      body
    );
  },

  downgradeSubscription: async (subscriptionId, body = {}) => {
    return requests.post(
      `${API_PREFIX}/subscriptions/${subscriptionId}/downgrade`,
      body
    );
  },

  suspendSubscription: async (subscriptionId) => {
    return requests.post(
      `${API_PREFIX}/subscriptions/${subscriptionId}/suspend`
    );
  },

  retryFailedPayment: async (subscriptionId) => {
    return requests.post(
      `${API_PREFIX}/subscriptions/${subscriptionId}/retry-payment`
    );
  },

  getAllSubscriptions: async (params = {}) => {
    return requests.get(`${API_PREFIX}/subscriptions`, params);
  },

  getTrialSubscriptions: async () => {
    return requests.get(`${API_PREFIX}/trials`);
  },

  updateTrialConfig: async (body) => {
    return requests.put(`${API_PREFIX}/trial-config`, body);
  },

  checkTrialEndings: async () => {
    return requests.get(`${API_PREFIX}/trials/ending-soon`);
  },

  processOverQuotaGracePeriods: async () => {
    return requests.post(`${API_PREFIX}/subscriptions/process-over-quota`);
  },

  getAllSubscriptionHistory: async (params = {}) => {
    return requests.get(`${API_PREFIX}/subscription-history`, params);
  },

  getAllSubscriptionEvents: async (params = {}) => {
    return requests.get(`${API_PREFIX}/subscription-events`, params);
  },

  getUsageQuotas: async () => {
    return requests.get(`${API_PREFIX}/usage`);
  },

  getAllPermissions: async (params = {}) => {
    return requests.get(`${API_PREFIX}/permissions`, params);
  },
};

export default planAPI;