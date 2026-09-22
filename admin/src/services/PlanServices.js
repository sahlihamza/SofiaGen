import requests from './httpService';

const PlanServices = {
  // Get all plans with pagination, search, filters
  getAllPlans: async (params = {}) => {
    return requests.get('/billing/plans', params);
  },

  // Get active plans only
  getActivePlans: async () => {
    return requests.get('/billing/plans/active/list');
  },

  // Get plan by ID
  getPlanById: async (id) => {
    return requests.get(`/billing/plans/${id}`);
  },

  // Create a new plan
  createPlan: async (body) => {
    return requests.post('/billing/plans', body);
  },

  // Update a plan
  updatePlan: async (id, body) => {
    return requests.put(`/billing/plans/${id}`, body);
  },

  // Clone a plan
  clonePlan: async (id, body = {}) => {
    return requests.post(`/billing/plans/${id}/clone`, body);
  },

  // Update plan status
  updatePlanStatus: async (id, status) => {
    return requests.patch(`/billing/plans/${id}/status`, { status });
  },

  // Activate a plan
  activatePlan: async (id) => {
    return requests.post(`/billing/plans/${id}/activate`);
  },

  // Deactivate a plan
  deactivatePlan: async (id, body) => {
    return requests.post(`/billing/plans/${id}/deactivate`, body);
  },

  // Archive a plan
  archivePlan: async (id) => {
    return requests.post(`/billing/plans/${id}/archive`);
  },

  // Assign plan to store / migrate subscription
  assignPlanToStore: async (id, body) => {
    return requests.post(`/billing/plans/${id}/assign`, body);
  },

  upgradeSubscription: async (subscriptionId, body = {}) => {
    return requests.post(`/billing/plans/subscriptions/${subscriptionId}/upgrade`, body);
  },

  downgradeSubscription: async (subscriptionId, body = {}) => {
    return requests.post(`/billing/plans/subscriptions/${subscriptionId}/downgrade`, body);
  },

  suspendSubscription: async (subscriptionId) => {
    return requests.post(`/billing/plans/subscriptions/${subscriptionId}/suspend`);
  },

  // Cancel subscription
  cancelSubscription: async (subscriptionId, body = {}) => {
    return requests.post(`/billing/plans/subscriptions/${subscriptionId}/cancel`, body);
  },

  // Get all subscriptions across plans
  getAllSubscriptions: async (params = {}) => {
    return requests.get('/billing/plans/subscriptions', params);
  },

  // Get subscriptions for a plan
  getPlanSubscriptions: async (id, params = {}) => {
    return requests.get(`/billing/plans/${id}/subscriptions`, params);
  },

  // Get subscriptions summary for a plan
  getPlanSubscriptionsSummary: async (id) => {
    return requests.get(`/billing/plans/${id}/subscriptions/summary`);
  },

  // Get affected stores for a plan
  getPlanAffectedStores: async (id) => {
    return requests.get(`/billing/plans/${id}/affected-stores`);
  },

  // Get audit log for a plan
  getPlanAuditLog: async (id, params = {}) => {
    return requests.get(`/billing/plans/${id}/audit-log`, params);
  },

  // Get usage quotas across all stores
  getUsageQuotas: async () => {
    return requests.get('/billing/plans/usage');
  },

  // Get trial subscriptions
  getTrialSubscriptions: async () => {
    return requests.get('/billing/plans/trials');
  },

  // Update trial configuration
  updateTrialConfig: async (config) => {
    return requests.put('/billing/plans/trial-config', config);
  },

  // Get plan history
  getPlanHistory: async (id) => {
    return requests.get(`/billing/plans/${id}/history`);
  },

  // Delete a plan
  deletePlan: async (id) => {
    return requests.delete(`/billing/plans/${id}`);
  },

  // Get global audit logs
  getAuditLogs: async (params = {}) => {
    return requests.get("/platform/audit-logs", params);
  },
};

export default PlanServices;
