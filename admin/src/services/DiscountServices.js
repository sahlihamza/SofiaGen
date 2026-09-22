import requests from "./httpService";

const DiscountServices = {
  getDiscounts: async (params = {}) => {
    return requests.get("/platform/discounts", params);
  },

  getDiscountByCode: async (code) => {
    return requests.get(`/platform/discounts/${code}`);
  },

  createDiscount: async (body) => {
    return requests.post("/platform/discounts", body);
  },

  updateDiscount: async (id, body) => {
    return requests.put(`/platform/discounts/${id}`, body);
  },

  deleteDiscount: async (id) => {
    return requests.delete(`/platform/discounts/${id}`);
  },

  applyDiscount: async (code, amount) => {
    return requests.post("/platform/discounts/apply", { code, amount });
  },

  toJson: (data) => JSON.stringify(data, null, 2),
};

export default DiscountServices;