import requests from "./httpService";

const PlanPriceServices = {
  // Get all plan prices with pagination/search/filters
  getAllPlanPrices: async (params = {}) => {
    return requests.get("/platform/plan-prices", params);
  },

  // Get a plan price by ID
  getPlanPriceById: async (id) => {
    return requests.get(`/platform/plan-prices/${id}`);
  },

  // Create a new plan price
  createPlanPrice: async (body) => {
    return requests.post("/platform/plan-prices", body);
  },

  // Update a plan price
  updatePlanPrice: async (id, body) => {
    return requests.put(`/platform/plan-prices/${id}`, body);
  },

  // Update plan price status
  updatePlanPriceStatus: async (id, status) => {
    return requests.patch(`/platform/plan-prices/${id}/status`, { status });
  },

  // Delete a plan price (archives non-draft)
  deletePlanPrice: async (id) => {
    return requests.delete(`/platform/plan-prices/${id}`);
  },

  // Get active prices for a plan
  getActivePricesForPlan: async (planId) => {
    return requests.get(`/platform/plan-prices/active/for-plan/${planId}`);
  },
};

export default PlanPriceServices;
