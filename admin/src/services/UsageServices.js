import requests from "./httpService";

/**
 * P7  Usage Tracking
 */
const UsageServices = {
  // Increment usage
  increment: async (body) => {
    return requests.post("/platform/usage/increment", body);
  },

  // Get current usage for a subscription
  getCurrentUsage: async (subscriptionId) => {
    return requests.get(`/platform/usage/subscriptions/${subscriptionId}/current`);
  },

  // Get usage history
  getHistory: async (params = {}) => {
    return requests.get("/platform/usage/history", params);
  },

  // List usage counters
  getCounters: async (params = {}) => {
    return requests.get("/platform/usage/counters", params);
  },

  // Usage summary
  getSummary: async () => {
    return requests.get("/platform/usage/summary");
  },

  toJson: (data) => JSON.stringify(data, null, 2),
};

export default UsageServices;
