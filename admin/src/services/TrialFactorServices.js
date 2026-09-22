import requests from "./httpService";

const TrialFactorServices = {
  getAllTrialFactors: async (params = {}) => {
    return requests.get("/platform/trial-factors", params);
  },
  getTrialFactorById: async (id) => {
    return requests.get(`/platform/trial-factors/${id}`);
  },
  getTrialFactorCategories: async () => {
    return requests.get("/platform/trial-factors/categories");
  },
  createTrialFactor: async (body) => {
    return requests.post("/platform/trial-factors", body);
  },
  updateTrialFactor: async (id, body) => {
    return requests.put(`/platform/trial-factors/${id}`, body);
  },
  deleteTrialFactor: async (id) => {
    return requests.delete(`/platform/trial-factors/${id}`);
  },
};

export default TrialFactorServices;
