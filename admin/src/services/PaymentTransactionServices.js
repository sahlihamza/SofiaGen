import requests from "./httpService";

const PaymentTransactionServices = {
  getAll: async (params = {}) => {
    return requests.get("/admin/payment-management/transactions", params);
  },

  getById: async (id) => {
    return requests.get(`/admin/payment-management/transactions/${id}`);
  },

  updateStatus: async (id, body) => {
    return requests.patch(`/admin/payment-management/transactions/${id}/status`, body);
  },

  retry: async (id) => {
    return requests.post(`/admin/payment-management/transactions/${id}/retry`);
  },

  getStats: async (params = {}) => {
    return requests.get("/admin/payment-management/transactions/stats", params);
  },
};

export default PaymentTransactionServices;
