import requests from "./httpService";

const AuditLogServices = {
  list: async (storeId, params) => {
    return requests.get(`/audit-log/${storeId}`, params);
  },
};

export default AuditLogServices;
