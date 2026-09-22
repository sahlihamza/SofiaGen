import requests from "./httpService";

const AccountsPrivacyServices = {
  getSettings: async (storeId) => {
    return requests.get(`/settings/accounts-privacy/${storeId}`);
  },

  updateSettings: async (storeId, body) => {
    return requests.put(`/settings/accounts-privacy/${storeId}`, body);
  },
};

export default AccountsPrivacyServices;
