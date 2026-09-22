import requests from "../httpService";

const API_PREFIX = "/v1/platform/roles";

const roleAPI = {
  getAllRoles: async (params = {}) => {
    return requests.get(API_PREFIX, params);
  },

  getRoleById: async (id) => {
    return requests.get(`${API_PREFIX}/${id}`);
  },

  createRole: async (body) => {
    return requests.post(API_PREFIX, body);
  },

  updateRole: async (id, body) => {
    return requests.put(`${API_PREFIX}/${id}`, body);
  },

  deleteRole: async (id) => {
    return requests.delete(`${API_PREFIX}/${id}`);
  },

  getAllPermissions: async (params = {}) => {
    console.log("[roleAPI] getAllPermissions", params);
    return requests.get(`${API_PREFIX}/permissions`, params);
  },
};

export default roleAPI;