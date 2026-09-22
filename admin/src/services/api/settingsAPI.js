import requests from "../httpService";

const API_PREFIX = "/v1/platform/settings";

const settingsAPI = {
  getSettings: async () => {
    return requests.get(API_PREFIX);
  },

  updateSettings: async (body) => {
    return requests.put(API_PREFIX, body);
  },

  getPasswordPolicy: async () => {
    return requests.get(`${API_PREFIX}/password-policy`);
  },

  updatePasswordPolicy: async (body) => {
    return requests.put(`${API_PREFIX}/password-policy`, body);
  },
};

export default settingsAPI;