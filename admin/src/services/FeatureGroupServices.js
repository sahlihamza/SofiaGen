import requests from "./httpService";

const FeatureGroupServices = {
  getAllFeatureGroups: async (params = {}) => {
    return requests.get("/platform/feature-groups", params);
  },
  getFeatureGroupById: async (id) => {
    return requests.get(`/platform/feature-groups/${id}`);
  },
  createFeatureGroup: async (body) => {
    return requests.post("/platform/feature-groups", body);
  },
  updateFeatureGroup: async (id, body) => {
    return requests.put(`/platform/feature-groups/${id}`, body);
  },
  deleteFeatureGroup: async (id) => {
    return requests.delete(`/platform/feature-groups/${id}`);
  },
};

export default FeatureGroupServices;
