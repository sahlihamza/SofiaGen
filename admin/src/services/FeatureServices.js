import requests from './httpService';

const FeatureServices = {
  getAllFeatures: async (params = {}) => {
    return requests.get('/platform/features', params);
  },

  getFeatureById: async (id) => {
    return requests.get(`/platform/features/${id}`);
  },

  createFeature: async (body) => {
    return requests.post('/platform/features', body);
  },

  updateFeature: async (id, body) => {
    return requests.put(`/platform/features/${id}`, body);
  },

  deleteFeature: async (id) => {
    return requests.delete(`/platform/features/${id}`);
  },
};

export default FeatureServices;