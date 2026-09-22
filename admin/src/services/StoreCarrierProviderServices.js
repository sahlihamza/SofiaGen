import requests from "./httpService";

const StoreCarrierProviderServices = {
  /**
   * Get all carrier providers for a store with connection status
   * Returns platform carriers merged with store-specific connection data
   */
  getStoreCarriers: async (storeId) => {
    return requests.get(`/stores/${storeId}/carrier-providers`);
  },

  /**
   * Connect a carrier provider to a store
   * @param {string} storeId - Store ID
   * @param {string} carrierProviderId - Carrier Provider ID
   * @param {object} credentials - Credentials (apiKey, secretKey, accountNumber, etc.)
   */
  connectCarrier: async (storeId, carrierProviderId, credentials) => {
    return requests.post(
      `/stores/${storeId}/carrier-providers/${carrierProviderId}/connect`,
      { credentials }
    );
  },

  /**
   * Disconnect a carrier from a store
   */
  disconnectCarrier: async (storeId, carrierProviderId) => {
    return requests.delete(
      `/stores/${storeId}/carrier-providers/${carrierProviderId}`
    );
  },

  /**
   * Update carrier capabilities (label generation, tracking)
   */
  updateCapabilities: async (storeId, carrierProviderId, capabilities) => {
    return requests.patch(
      `/stores/${storeId}/carrier-providers/${carrierProviderId}/capabilities`,
      capabilities
    );
  },
};

export default StoreCarrierProviderServices;
