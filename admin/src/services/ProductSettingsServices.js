import requests from "./httpService";

const ProductSettingsServices = {
  getProductSettings: async (storeId) => {
    return requests.get(`/settings/products/${storeId}`);
  },

  updateProductSettings: async (storeId, body) => {
    return requests.put(`/settings/products/${storeId}`, body);
  },
};

export default ProductSettingsServices;
