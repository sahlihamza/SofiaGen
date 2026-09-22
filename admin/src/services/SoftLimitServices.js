import requests from "./httpService";

const SoftLimitServices = {
  // List soft-limit states with filters/pagination
  getAll: async (params = {}) => {
    return requests.get("/platform/soft-limits", params);
  },

  // Summary counts grouped by state
  getSummary: async () => {
    return requests.get("/platform/soft-limits/summary");
  },

  // List PlanQuota docs with soft-limit thresholds
  getPlanQuotas: async (params = {}) => {
    return requests.get("/platform/soft-limits/plan-quotas", params);
  },

  // Update soft-limit thresholds on a PlanQuota
  updatePlanQuota: async (id, body) => {
    return requests.patch(`/platform/soft-limits/plan-quotas/${id}`, body);
  },

  // Evaluate a store (or a single usage pair)
  evaluate: async (body) => {
    return requests.post("/platform/soft-limits/evaluate", body);
  },

  // Global sweep
  evaluateAll: async () => {
    return requests.post("/platform/soft-limits/evaluate-all");
  },
};

export default SoftLimitServices;
