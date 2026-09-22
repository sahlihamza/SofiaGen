import requests from "./httpService";

const SubscriptionServices = {
  // Get current user's subscription
  getMySubscription: async () => {
    return requests.get("/platform/subscriptions/me");
  },

  // Get subscription history for a store
  getHistory: async (params = {}) => {
    return requests.get("/billing/plans/subscription-history", params);
  },

  // Get subscription events for a store
  getEvents: async (params = {}) => {
    return requests.get("/billing/plans/subscription-events", params);
  },

  // Get all subscriptions with pagination
  getAllSubscriptions: async (params = {}) => {
    return requests.get("/billing/plans/subscriptions", params);
  },

  // Get subscription by ID with details
  getSubscriptionById: async (id) => {
    return requests.get(`/billing/plans/subscriptions/${id}`);
  },

  // Get subscription usage/stats
  getSubscriptionStats: async (id) => {
    return requests.get(`/billing/plans/subscriptions/${id}/stats`);
  },

  // Create a subscription
  createSubscription: async (body) => {
    return requests.post("/billing/plans/subscriptions", body);
  },

  // Update subscription
  updateSubscription: async (id, body) => {
    return requests.put(`/billing/plans/subscriptions/${id}`, body);
  },

  // Cancel subscription
  cancelSubscription: async (id, body = {}) => {
    return requests.post(`/billing/plans/subscriptions/${id}/cancel`, body);
  },

  // Renew subscription
  renewSubscription: async (id, body = {}) => {
    return requests.post(`/billing/plans/subscriptions/${id}/renew`, body);
  },

  // Resume subscription
  resumeSubscription: async (id, body = {}) => {
    return requests.post(`/billing/plans/subscriptions/${id}/resume`, body);
  },

  // Apply coupon to subscription
  applyCouponToSubscription: async (id, code) => {
    return requests.post(`/billing/plans/subscriptions/${id}/apply-coupon`, { code });
  },

  // Upgrade subscription
  upgradeSubscription: async (id, body = {}) => {
    return requests.post(`/billing/plans/subscriptions/${id}/upgrade`, body);
  },

  // Downgrade subscription
  downgradeSubscription: async (id, body = {}) => {
    return requests.post(`/billing/plans/subscriptions/${id}/downgrade`, body);
  },

  // Get subscription billing cycles
  getBillingCycles: async (id) => {
    return requests.get(`/billing/plans/subscriptions/${id}/billing-cycles`);
  },
};

export default SubscriptionServices;
