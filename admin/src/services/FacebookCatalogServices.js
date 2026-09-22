import requests from "./httpService";

const FacebookCatalogServices = {
  getSettings: async (storeId) => {
    return requests.get(`/integrations/facebook-catalog/${storeId}/settings`);
  },
  updateSettings: async (storeId, body) => {
    return requests.put(`/integrations/facebook-catalog/${storeId}/settings`, body);
  },
  getStatus: async (storeId) => {
    return requests.get(`/integrations/facebook-catalog/${storeId}/status`);
  },
  regenerate: async (storeId) => {
    return requests.post(`/integrations/facebook-catalog/${storeId}/regenerate`, {});
  },
  testFeed: async (storeId) => {
    return requests.post(`/integrations/facebook-catalog/${storeId}/test`, {});
  },
  previewProduct: async (storeId, productId) => {
    return requests.get(`/integrations/facebook-catalog/${storeId}/preview/${productId}`);
  },
};

export default FacebookCatalogServices;