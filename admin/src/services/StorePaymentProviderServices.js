import requests from "./httpService";

const StorePaymentProviderServices = {
  getStoreProviders: async (storeId) => {
    return requests.get(`/stores/payment-providers/${storeId}/providers`);
  },

  getStoreProvider: async (storeId, providerId) => {
    return requests.get(`/stores/payment-providers/${storeId}/providers/${providerId}`);
  },

  createStoreProvider: async (storeId, body) => {
    return requests.post(`/stores/payment-providers/${storeId}/providers`, body);
  },

  updateStoreProvider: async (storeId, providerId, body) => {
    return requests.put(`/stores/payment-providers/${storeId}/providers/${providerId}`, body);
  },

  removeStoreProvider: async (storeId, providerId) => {
    return requests.delete(`/stores/payment-providers/${storeId}/providers/${providerId}`);
  },

  getAvailableMethods: async (storeId, params = {}) => {
    return requests.get(`/stores/payment-providers/${storeId}/available-methods`, { params });
  },

  getCredentials: async (storeId, providerId) => {
    return requests.get(`/stores/payment-providers/${storeId}/providers/${providerId}/credentials`);
  },

  testConnection: async (storeId, providerId) => {
    return requests.post(`/stores/payment-providers/${storeId}/providers/${providerId}/test-connection`);
  },
};

export default StorePaymentProviderServices;
