import requests from "./httpService";

const PointOfSaleSettingsServices = {
  getSettings: async (storeId) => {
    return requests.get(`/settings/point-of-sale/${storeId}`);
  },

  updateSettings: async (storeId, body) => {
    return requests.put(`/settings/point-of-sale/${storeId}`, body);
  },
};

export default PointOfSaleSettingsServices;
