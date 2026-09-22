import requests from "./httpService";

const MarketingSettingsServices = {
  getSettings: async (storeId) => {
    return requests.get(`/settings/marketing/${storeId}`);
  },

  updateSettings: async (storeId, body) => {
    return requests.put(`/settings/marketing/${storeId}`, body);
  },

  testMeta: async (storeId) => {
    return requests.post(`/settings/marketing/${storeId}/meta/test`);
  },

  testGa4: async (storeId) => {
    return requests.post(`/settings/marketing/${storeId}/ga4/test`);
  },
};

export default MarketingSettingsServices;