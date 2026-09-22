import requests from './httpService';

const QuotaTypeServices = {
  getAllQuotaTypes: async (params = {}) => {
    return requests.get('/platform/quota-types', params);
  },

  getQuotaTypeById: async (id) => {
    return requests.get(`/platform/quota-types/${id}`);
  },

  createQuotaType: async (body) => {
    return requests.post('/platform/quota-types', body);
  },

  updateQuotaType: async (id, body) => {
    return requests.put(`/platform/quota-types/${id}`, body);
  },

  deleteQuotaType: async (id) => {
    return requests.delete(`/platform/quota-types/${id}`);
  },
};

export default QuotaTypeServices;