import requests from "./httpService";

const PlanEligibilityServices = {
  // Get all eligibility rules with pagination, search, filters
  getAllRules: async (params = {}) => {
    return requests.get("/platform/plan-eligibility", params);
  },

  // Get eligibility rule by ID
  getRuleById: async (id) => {
    return requests.get(`/platform/plan-eligibility/${id}`);
  },

  // Create eligibility rule
  createRule: async (body) => {
    return requests.post("/platform/plan-eligibility", body);
  },

  // Update eligibility rule
  updateRule: async (id, body) => {
    return requests.put(`/platform/plan-eligibility/${id}`, body);
  },

  // Delete eligibility rule
  deleteRule: async (id) => {
    return requests.delete(`/platform/plan-eligibility/${id}`);
  },

  // Update eligibility rule status
  updateRuleStatus: async (id, status) => {
    return requests.patch(`/platform/plan-eligibility/${id}/status`, { status });
  },

  // Clone eligibility rule
  cloneRule: async (id) => {
    return requests.post(`/platform/plan-eligibility/${id}/clone`);
  },

  // Evaluate eligibility for a store against a plan
  evaluate: async (body) => {
    return requests.post("/platform/plan-eligibility/evaluate", body);
  },

  // Test an unsaved rule against a store
  testRule: async (body) => {
    return requests.post("/platform/plan-eligibility/test", body);
  },

  // Get trial factors (for the rule builder factor selector)
  getFactors: async () => {
    return requests.get("/platform/trial-factors");
  },
};

export default PlanEligibilityServices;
