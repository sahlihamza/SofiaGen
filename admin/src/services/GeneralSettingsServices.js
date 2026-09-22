import requests from "./httpService";

const GeneralSettingsServices = {
  getGeneralSettings: async (storeId) => {
    return requests.get(`/settings/general/${storeId}`);
  },

  updateGeneralSettings: async (storeId, body) => {
    return requests.put(`/settings/general/${storeId}`, body);
  },
};

export default GeneralSettingsServices;
