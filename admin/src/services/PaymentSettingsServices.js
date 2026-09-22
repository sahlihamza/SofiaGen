import requests from "./httpService";

const PaymentSettingsServices = {
  getPaymentSettings: async (storeId) => {
    return requests.get(`/settings/payments/${storeId}`);
  },

  updatePaymentSettings: async (storeId, body) => {
    return requests.put(`/settings/payments/${storeId}`, body);
  },

  toggleMethod: async (storeId, key, enabled) => {
    return requests.patch(
      `/settings/payments/${storeId}/methods/${key}/toggle`,
      { enabled }
    );
  },

  reorderMethods: async (storeId, orderedKeys) => {
    return requests.patch(`/settings/payments/${storeId}/reorder`, {
      orderedKeys,
    });
  },
};

export default PaymentSettingsServices;
