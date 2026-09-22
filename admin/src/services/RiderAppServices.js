import requests from "./httpService";

// Endpoints for the logged-in rider's own driver dashboard (/api/rider-app).
// Distinct from RiderServices.js, which is the admin-facing CRUD for managing
// riders  a rider's own token has no access to those admin routes at all.
const RiderAppServices = {
  getMyStats: async () => {
    return requests.get("/rider-app/stats");
  },
  getMyOrders: async (params) => {
    return requests.get("/rider-app/orders", params);
  },
  updateMyAvailability: async () => {
    return requests.put("/rider-app/availability");
  },
};

export default RiderAppServices;
