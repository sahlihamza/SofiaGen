import requests from "./httpService";

const WebsiteVisibilityServices = {
  getSettings: async (storeId) => {
    return requests.get(`/settings/website-visibility/${storeId}`);
  },

  updateSettings: async (storeId, body) => {
    return requests.put(`/settings/website-visibility/${storeId}`, body);
  },

  resetSessions: async (storeId) => {
    return requests.post(
      `/settings/website-visibility/${storeId}/reset-sessions`,
      {}
    );
  },
  previewMode: async (storeId, mode, theme) => {
    return requests.get(
      `/settings/website-visibility/${storeId}/preview`,
      { mode, theme }
    );
  },
};

export default WebsiteVisibilityServices;
