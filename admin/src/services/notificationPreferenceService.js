import requests from "@/services/httpService";

const NotificationPreferenceService = {
  getPreferences: async (storeId) => {
    return requests.get(`/notifications/preferences${storeId ? `?storeId=${storeId}` : ""}`);
  },

  updatePreferences: async (preferences, storeId) => {
    return requests.put("/notifications/preferences", { preferences, storeId });
  },
};

export default NotificationPreferenceService;
