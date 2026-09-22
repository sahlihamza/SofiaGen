import requests from "./httpService";

const PaymentProviderServices = {
  getProviders: async (params = {}) => {
    return requests.get("/platform/payment-providers", params);
  },

  getProvider: async (id) => {
    return requests.get(`/platform/payment-providers/${id}`);
  },

  createProvider: async (body) => {
    return requests.post("/platform/payment-providers", body);
  },

  updateProvider: async (id, body) => {
    return requests.put(`/platform/payment-providers/${id}`, body);
  },

  deleteProvider: async (id) => {
    return requests.delete(`/platform/payment-providers/${id}`);
  },

  enableProvider: async (id) => {
    return requests.post(`/platform/payment-providers/${id}/enable`);
  },

  disableProvider: async (id) => {
    return requests.post(`/platform/payment-providers/${id}/disable`);
  },

  updateConfig: async (id, body) => {
    return requests.put(`/platform/payment-providers/${id}/config`, body);
  },

  getAvailableForStore: async (storeId) => {
    return requests.get(`/platform/payment-providers/available/store/${storeId}`);
  },

  getAvailable: async (params = {}) => {
    return requests.get("/platform/payment-providers/available", { params });
  },
};

export default PaymentProviderServices;
