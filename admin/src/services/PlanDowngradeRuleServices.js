import requests from "./httpService";

/**
 * P5  Plan Downgrade Rules
 */
const PlanDowngradeRuleServices = {
  // List rules with filters
  getDowngradeRules: async (params = {}) => {
    return requests.get("/platform/downgrade-rules", params);
  },

  // Get one rule
  getDowngradeRule: async (id) => {
    return requests.get(`/platform/downgrade-rules/${id}`);
  },

  // Create a rule
  createDowngradeRule: async (body) => {
    return requests.post("/platform/downgrade-rules", body);
  },

  // Update a rule
  updateDowngradeRule: async (id, body) => {
    return requests.put(`/platform/downgrade-rules/${id}`, body);
  },

  // Update rule status
  updateDowngradeRuleStatus: async (id, status) => {
    return requests.patch(`/platform/downgrade-rules/${id}/status`, { status });
  },

  // Clone a rule
  cloneDowngradeRule: async (id) => {
    return requests.post(`/platform/downgrade-rules/${id}/clone`);
  },

  // Delete a rule
  deleteDowngradeRule: async (id) => {
    return requests.delete(`/platform/downgrade-rules/${id}`);
  },

  // Validate a downgrade (checks quota fit, no write)
  validateDowngrade: async (body) => {
    return requests.post("/platform/downgrade-rules/validate", body);
  },

  // Execute a downgrade
  executeDowngrade: async (body) => {
    return requests.post("/platform/downgrade-rules/execute", body);
  },

  // Utility: JSON export
  toJson: (data) => JSON.stringify(data, null, 2),
};

export default PlanDowngradeRuleServices;
