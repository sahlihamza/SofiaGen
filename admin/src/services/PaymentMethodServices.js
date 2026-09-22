import requests from "./httpService";

const PaymentMethodServices = {
  getMethods: async (params = {}) => {
    return requests.get("/admin/payments/payment-methods", params);
  },

  getMethod: async (id) => {
    return requests.get(`/admin/payments/payment-methods/${id}`);
  },

  createMethod: async (body) => {
    return requests.post("/admin/payments/payment-methods", body);
  },

  updateMethod: async (id, body) => {
    return requests.put(`/admin/payments/payment-methods/${id}`, body);
  },

  deleteMethod: async (id) => {
    return requests.delete(`/admin/payments/payment-methods/${id}`);
  },

  getMethodProviders: async (id) => {
    return requests.get(`/admin/payments/payment-methods/${id}/providers`);
  },
};

export default PaymentMethodServices;
