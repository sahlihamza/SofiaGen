import requests from "../httpService";

const API_PREFIX = "/role-templates";

const roleTemplateAPI = {
  getAllTemplates: async () => {
    return requests.get(API_PREFIX);
  },

  getTemplateById: async (id) => {
    return requests.get(`${API_PREFIX}/${id}`);
  },

  createTemplate: async (body) => {
    return requests.post(API_PREFIX, body);
  },

  updateTemplate: async (id, body) => {
    return requests.put(`${API_PREFIX}/${id}`, body);
  },

  deleteTemplate: async (id) => {
    return requests.delete(`${API_PREFIX}/${id}`);
  },
};

export default roleTemplateAPI;
