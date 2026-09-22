import requests from "./httpService";

const ShippingClassServices = {
  getAllShippingClasses: async () => {
    return requests.get("/shipping-classes");
  },

  addShippingClass: async (body) => {
    return requests.post("/shipping-classes/add", body);
  },

  updateShippingClass: async (id, body) => {
    return requests.put(`/shipping-classes/${id}`, body);
  },

  deleteShippingClass: async (id) => {
    return requests.delete(`/shipping-classes/${id}`);
  },
};

export default ShippingClassServices;
