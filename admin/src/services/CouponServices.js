import requests from "./httpService";
import { createCrudService } from "./createCrudService";

// CRUD + workflow actions for Coupon. Backend mounted at /api/coupon/.
const CouponServices = {
  ...createCrudService({
    resource: "coupon",
    // The coupon resource uses bare POST/PUT (no /add suffix), so we
    // override add/update to match the backend's actual path.
  }),
  // Override add to drop the /add suffix (backend uses POST /coupon).
  add: async (body) => requests.post("/coupon", body),

  // The backend's getAllCoupons takes a complex filter set.
  getAllCoupons: async ({
    search = "",
    status = "",
    page = "",
    limit = "",
    deletedOnly = "",
    usedOnly = "",
    allowFreeShipping = "",
    autoApply = "",
  } = {}) => {
    const params = new URLSearchParams();
    Object.entries({ search, status, page, limit, deletedOnly, usedOnly, allowFreeShipping, autoApply }).forEach(
      ([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          params.set(key, value);
        }
      }
    );
    return requests.get(`/coupon?${params.toString()}`);
  },

  getCouponById: async (id) => requests.get(`/coupon/${id}`),
  updateCoupon: async (id, body) => requests.put(`/coupon/${id}`, body),

  duplicateCoupon: async (id) => requests.post(`/coupon/${id}/duplicate`),
  archiveCoupon: async (id) => requests.put(`/coupon/${id}/archive`),
  activateCoupon: async (id) => requests.put(`/coupon/${id}/activate`),
  deactivateCoupon: async (id) => requests.put(`/coupon/${id}/deactivate`),
  restoreCoupon: async (id) => requests.put(`/coupon/${id}/restore`),
  deleteCoupon: async (id) => requests.delete(`/coupon/${id}`),

  getCouponConditions: async (id) => requests.get(`/coupon/${id}/conditions`),
  updateCouponConditions: async (id, body) => requests.put(`/coupon/${id}/conditions`, body),

  getCouponRules: async (id) => requests.get(`/coupon/${id}/rules`),
  addRuleCondition: async (id, body) => requests.post(`/coupon/${id}/rules/conditions`, body),
  updateRuleCondition: async (id, ruleId, body) =>
    requests.put(`/coupon/${id}/rules/conditions/${ruleId}`, body),
  deleteRuleCondition: async (id, ruleId) => requests.delete(`/coupon/${id}/rules/conditions/${ruleId}`),

  addRuleGroup: async (id, body) => requests.post(`/coupon/${id}/rules/groups`, body),
  updateRuleGroup: async (id, groupId, body) => requests.put(`/coupon/${id}/rules/groups/${groupId}`, body),
  deleteRuleGroup: async (id, groupId) => requests.delete(`/coupon/${id}/rules/groups/${groupId}`),

  getCouponUsages: async (id, { page = "", limit = "" } = {}) => {
    const params = new URLSearchParams();
    Object.entries({ page, limit }).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) params.set(key, value);
    });
    return requests.get(`/coupon/${id}/usages?${params.toString()}`);
  },
};

export default CouponServices;
