import requests from "./httpService";

const PickupLocationServices = {
  getAllPickupLocations: async () => {
    return requests.get("/pickup-locations");
  },

  addPickupLocation: async (body) => {
    return requests.post("/pickup-locations/add", body);
  },

  updatePickupLocation: async (id, body) => {
    return requests.put(`/pickup-locations/${id}`, body);
  },

  deletePickupLocation: async (id) => {
    return requests.delete(`/pickup-locations/${id}`);
  },
};

export default PickupLocationServices;
