import requests from "./httpService";

/**
 * P6  Overage Billing
 */
const OverageServices = {
  // List rules with filters
  getOverages: async (params = {}) => {
    return requests.get("/platform/overages", params);
  },

  // Get one rule
  getOverage: async (id) => {
    return requests.get(`/platform/overages/${id}`);
  },

  // Create a rule
  createOverage: async (body) => {
    return requests.post("/platform/overages", body);
  },

  // Update a rule
  updateOverage: async (id, body) => {
    return requests.put(`/platform/overages/${id}`, body);
  },

  // Update rule status
  updateOverageStatus: async (id, status) => {
    return requests.patch(`/platform/overages/${id}/status`, { status });
  },

  // Delete a rule
  deleteOverage: async (id) => {
    return requests.delete(`/platform/overages/${id}`);
  },

  // Calculate overage for a subscription (no write)
  calculateOverage: async (body) => {
    return requests.post("/platform/overages/calculate", body);
  },

  // Generate overage invoice
  generateOverageInvoice: async (body) => {
    return requests.post("/platform/overages/generate-invoice", body);
  },

  // Utility: JSON export
  toJson: (data) => JSON.stringify(data, null, 2),
};

export default OverageServices;
