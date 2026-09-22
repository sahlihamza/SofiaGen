import requests from "./httpService";

const GdprServices = {
  exportCustomerData: async (storeId, customerEmail) => {
    return requests.post(`/gdpr/${storeId}/export`, { customerEmail });
  },

  deleteCustomerData: async (storeId, customerEmail) => {
    return requests.post(`/gdpr/${storeId}/delete`, { customerEmail });
  },

  anonymizeCustomerData: async (storeId, customerEmail) => {
    return requests.post(`/gdpr/${storeId}/anonymize`, { customerEmail });
  },

  listRequests: async (storeId, params) => {
    return requests.get(`/gdpr/${storeId}/requests`, params);
  },
};

export default GdprServices;
