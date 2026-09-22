import requests from "./httpService";

const TrialRuleServices = {
  // Rule CRUD
  getAllTrialRules: async (params = {}) => {
    return requests.get("/platform/trial-rules", params);
  },
  getTrialRuleById: async (id) => {
    return requests.get(`/platform/trial-rules/${id}`);
  },
  createTrialRule: async (body) => {
    return requests.post("/platform/trial-rules", body);
  },
  updateTrialRule: async (id, body) => {
    return requests.put(`/platform/trial-rules/${id}`, body);
  },
  deleteTrialRule: async (id) => {
    return requests.delete(`/platform/trial-rules/${id}`);
  },
  updateTrialRuleStatus: async (id, status) => {
    return requests.patch(`/platform/trial-rules/${id}/status`, { status });
  },

  // Rule Builder
  cloneTrialRule: async (id) => {
    return requests.post(`/platform/trial-rules/${id}/clone`);
  },
  testTrialRule: async (body) => {
    return requests.post("/platform/trial-rules/test", body);
  },
  previewTrialRule: async (body) => {
    return requests.post("/platform/trial-rules/preview", body);
  },
  getTrialActionTypes: async () => {
    return requests.get("/platform/trial-rules/action-types");
  },
};

export default TrialRuleServices;
