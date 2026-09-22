const { eventBus } = require("../lib/eventBus");
const StoreOwnerDashboardServiceV2 = require("./StoreOwnerDashboardServiceV2");
const DASHBOARD_INVALIDATING_EVENTS = [
  "order.created",
  "order.updated",
  "product.created",
  "product.updated",
  "product.low_stock",
  "product.out_of_stock",
  "review.created",
  "review.approved",
  "review.rejected",
  "customer.created",
  "customer.updated",
  "payment.updated",
];

let registered = false;

const registerDashboardCacheHandlers = () => {
  if (registered) return;
  for (const eventName of DASHBOARD_INVALIDATING_EVENTS) {
    eventBus.on(eventName, (payload = {}) => {
      if (!payload.storeId) return;
      StoreOwnerDashboardServiceV2.invalidateCache(payload.storeId).catch(() => {});
    });
  }
  registered = true;
};

module.exports = { registerDashboardCacheHandlers };
