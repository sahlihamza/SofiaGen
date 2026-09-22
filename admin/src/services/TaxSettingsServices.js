import requests from "./httpService";

const TaxSettingsServices = {
  getSettings: async (storeId) => {
    return requests.get(`/settings/tax/${storeId}`);
  },

  updateOptions: async (storeId, body) => {
    return requests.put(`/settings/tax/${storeId}/options`, body);
  },

  updateTaxClasses: async (storeId, classes) => {
    return requests.put(`/settings/tax/${storeId}/classes`, { classes });
  },

  updateRates: async (storeId, taxClass, rates) => {
    return requests.put(
      `/settings/tax/${storeId}/rates/${encodeURIComponent(taxClass)}`,
      { rates }
    );
  },
};

export default TaxSettingsServices;
