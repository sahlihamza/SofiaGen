import requests from "./httpService";

const RiderServices = {
  getAllRiders: async () => {
    return requests.get("/riders");
  },
  getRiderStats: async () => {
    return requests.get("/riders/stats");
  },
  getRiderById: async (id) => {
    return requests.get(`/riders/${id}`);
  },
  getRiderOrders: async (id, params) => {
    return requests.get(`/riders/${id}/orders`, params);
  },
  addRider: async (body) => {
    return requests.post("/riders", body);
  },
  updateRider: async (id, body) => {
    return requests.put(`/riders/${id}`, body);
  },
  updateRiderStatus: async (id) => {
    return requests.put(`/riders/${id}/status`);
  },
  deleteRider: async (id) => {
    return requests.delete(`/riders/${id}`);
  },
};

export default RiderServices;