import requests from "./httpService";

const RoleServices = {
  getPermissions: async () => {
    return requests.get("/roles/permissions");
  },

  getRoles: async () => {
    return requests.get("/roles/roles");
  },

  getPredefinedRoles: async () => {
    return requests.get("/roles/predefined");
  },

  getRoleById: async (id) => {
    return requests.get(`/roles/roles/${id}`);
  },

  createRole: async (body) => {
    return requests.post("/roles/roles", body);
  },

  updateRole: async (id, body) => {
    return requests.put(`/roles/roles/${id}`, body);
  },

  assignPermissions: async (id, body) => {
    return requests.put(`/roles/roles/${id}/permissions`, body);
  },

  deleteRole: async (id) => {
    return requests.delete(`/roles/roles/${id}`);
  },
};

export default RoleServices;
