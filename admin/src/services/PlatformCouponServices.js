import requests from './httpService';

const PlatformCouponServices = {
  getAllCoupons: async (params = {}) => {
    return requests.get('/platform/coupons', params);
  },
  getCouponById: async (id) => {
    return requests.get(`/platform/coupons/${id}`);
  },
  addCoupon: async (body) => {
    return requests.post('/platform/coupons', body);
  },
  updateCoupon: async (id, body) => {
    return requests.put(`/platform/coupons/${id}`, body);
  },
  updateStatus: async (id, body) => {
    return requests.put(`/platform/coupons/${id}/status`, body);
  },
  deleteCoupon: async (id) => {
    return requests.delete(`/platform/coupons/${id}`);
  },
  deleteManyCoupons: async (body) => {
    return requests.patch(`/platform/coupons/delete/many`, body);
  },
  updateManyCoupons: async (body) => {
    return requests.patch(`/platform/coupons/update/many`, body);
  },
  restoreCoupon: async (id) => {
    return requests.put(`/platform/coupons/${id}/restore`);
  },
  activateCoupon: async (id) => {
    return requests.post(`/platform/coupons/${id}/activate`);
  },
  deactivateCoupon: async (id) => {
    return requests.post(`/platform/coupons/${id}/deactivate`);
  },
};

export default PlatformCouponServices;