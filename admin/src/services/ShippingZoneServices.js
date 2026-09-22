import requests from "./httpService";

const ShippingZoneServices = {
  // GET /api/shipping-zones/ -> ShippingZone[]
  getAllShippingZones: async () => {
    return requests.get("/shipping-zones");
  },

  addShippingZone: async (body) => {
    return requests.post("/shipping-zones/add", body);
  },

  updateShippingZone: async (id, body) => {
    return requests.put(`/shipping-zones/${id}`, body);
  },

  deleteShippingZone: async (id) => {
    return requests.delete(`/shipping-zones/${id}`);
  },

  reorderShippingZones: async (orderedIds) => {
    return requests.patch("/shipping-zones/reorder", { orderedIds });
  },

  addShippingMethod: async (zoneId, body) => {
    return requests.post(`/shipping-zones/${zoneId}/methods`, body);
  },

  updateShippingMethod: async (zoneId, methodId, body) => {
    return requests.put(`/shipping-zones/${zoneId}/methods/${methodId}`, body);
  },

  deleteShippingMethod: async (zoneId, methodId) => {
    return requests.delete(`/shipping-zones/${zoneId}/methods/${methodId}`);
  },

  reorderShippingMethods: async (zoneId, orderedIds) => {
    return requests.patch(`/shipping-zones/${zoneId}/methods/reorder`, {
      orderedIds,
    });
  },
};

export default ShippingZoneServices;
