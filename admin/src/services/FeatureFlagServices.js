import requests from "./httpService";

const FeatureFlagServices = {
  // Get all feature flags
  getAll: async (params = {}) => {
    return requests.get("/platform/feature-flags", params);
  },

  // Get feature flag by code
  getByCode: async (code) => {
    return requests.get(`/platform/feature-flags/${code}`);
  },

  // Create feature flag
  create: async (body) => {
    return requests.post("/platform/feature-flags", body);
  },

  // Update feature flag
  update: async (id, body) => {
    return requests.put(`/platform/feature-flags/${id}`, body);
  },

  // Delete feature flag
  delete: async (id) => {
    return requests.delete(`/platform/feature-flags/${id}`);
  },

  // Toggle for specific store
  toggleForStore: async (flagId, storeId, enable) => {
    return requests.post(`/platform/feature-flags/${flagId}/toggle/${storeId}`, { enable });
  },

  // Get flags for a plan
  getForPlan: async (planId) => {
    return requests.get(`/platform/feature-flags/plan/${planId}`);
  },

  // Get available features for a store
  getAvailable: async (storeId) => {
    return requests.get(`/platform/feature-flags/store/${storeId}/available`);
  },
};

export default FeatureFlagServices;
