import requests from "./httpService";

/**
 * P4  Plan Upgrade Rules
 */
const PlanUpgradeRuleServices = {
  // List rules with filters
  getUpgradeRules: async (params = {}) => {
    return requests.get("/platform/upgrade-rules", params);
  },

  // Get one rule
  getUpgradeRule: async (id) => {
    return requests.get(`/platform/upgrade-rules/${id}`);
  },

  // Create a rule
  createUpgradeRule: async (body) => {
    return requests.post("/platform/upgrade-rules", body);
  },

  // Update a rule
  updateUpgradeRule: async (id, body) => {
    return requests.put(`/platform/upgrade-rules/${id}`, body);
  },

  // Update rule status
  updateUpgradeRuleStatus: async (id, status) => {
    return requests.patch(`/platform/upgrade-rules/${id}/status`, { status });
  },

  // Clone a rule
  cloneUpgradeRule: async (id) => {
    return requests.post(`/platform/upgrade-rules/${id}/clone`);
  },

  // Delete a rule
  deleteUpgradeRule: async (id) => {
    return requests.delete(`/platform/upgrade-rules/${id}`);
  },

  // Preview an upgrade (no write)
  previewUpgrade: async (body) => {
    return requests.post("/platform/upgrade-rules/preview", body);
  },

  // Execute an upgrade
  executeUpgrade: async (body) => {
    return requests.post("/platform/upgrade-rules/execute", body);
  },

  // Utility: JSON export
  toJson: (data) => JSON.stringify(data, null, 2),
};

export default PlanUpgradeRuleServices;
