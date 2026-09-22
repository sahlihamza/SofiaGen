import requests from "./httpService";

const GracePeriodServices = {
  getGracePeriods: async (params = {}) => {
    return requests.get("/platform/grace-periods", params);
  },

  getGracePeriodById: async (id) => {
    return requests.get(`/platform/grace-periods/${id}`);
  },

  createGracePeriod: async (body) => {
    return requests.post("/platform/grace-periods", body);
  },

  resolveGracePeriod: async (id, body = {}) => {
    return requests.patch(`/platform/grace-periods/${id}/resolve`, body);
  },

  escalateGracePeriod: async (id) => {
    return requests.patch(`/platform/grace-periods/${id}/escalate`);
  },

  expireGracePeriods: async () => {
    return requests.post("/platform/grace-periods/expire");
  },

  getActiveGracePeriods: async () => {
    return requests.get("/platform/grace-periods/active");
  },

  toJson: (data) => JSON.stringify(data, null, 2),
};

export default GracePeriodServices;