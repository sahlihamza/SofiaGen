import requests from "../httpService";

const API_PREFIX = "/v1/platform/dashboard";

const platformDashboardAPI = {
  getDashboard: async () => {
    return requests.get(API_PREFIX);
  },
};

export default platformDashboardAPI;
