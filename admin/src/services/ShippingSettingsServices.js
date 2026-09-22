import requests from "./httpService";

const ShippingSettingsServices = {
  getShippingSettings: async (storeId) => {
    return requests.get(`/settings/shipping/${storeId}`);
  },

  updateShippingSettings: async (storeId, body) => {
    return requests.put(`/settings/shipping/${storeId}`, body);
  },
};

export default ShippingSettingsServices;
