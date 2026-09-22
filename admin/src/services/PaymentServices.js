import requests from "./httpService";

const PaymentServices = {
  getPayments: async (params = {}) => {
    return requests.get("/platform/payments", params);
  },

  retryPayment: async (id) => {
    return requests.post(`/platform/payments/${id}/retry`);
  },

  getPaymentById: async (id) => {
    return requests.get(`/platform/payments/${id}`);
  },
};

export default PaymentServices;
