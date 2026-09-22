import httpService from "./httpService";

const ReturnRequestServices = {
  getReturnRequests: async (storeId, { status, page = 1, limit = 20 } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", page);
    params.set("limit", limit);
    return httpService.get(`/stores/${storeId}/return-requests?${params.toString()}`);
  },

  getReturnRequestById: async (storeId, id) => {
    return httpService.get(`/stores/${storeId}/return-requests/${id}`);
  },

  approve: async (storeId, id) => httpService.post(`/stores/${storeId}/return-requests/${id}/approve`),
  markAwaitingReturn: async (storeId, id) => httpService.post(`/stores/${storeId}/return-requests/${id}/awaiting-return`),
  markReceived: async (storeId, id) => httpService.post(`/stores/${storeId}/return-requests/${id}/received`),
  refund: async (storeId, id) => httpService.post(`/stores/${storeId}/return-requests/${id}/refund`),
  reject: async (storeId, id, rejectionReason) =>
    httpService.post(`/stores/${storeId}/return-requests/${id}/reject`, { rejectionReason }),
};

export default ReturnRequestServices;
