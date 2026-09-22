import requests from "./httpService";

const PaymentRuleServices = {
  getAll: async (params = {}) => {
    return requests.get("/admin/payment-management/rules", params);
  },

  getById: async (id) => {
    return requests.get(`/admin/payment-management/rules/${id}`);
  },

  create: async (body) => {
    return requests.post("/admin/payment-management/rules", body);
  },

  update: async (id, body) => {
    return requests.put(`/admin/payment-management/rules/${id}`, body);
  },

  delete: async (id) => {
    return requests.delete(`/admin/payment-management/rules/${id}`);
  },
};

export default PaymentRuleServices;
