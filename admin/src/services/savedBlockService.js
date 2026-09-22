import httpService from "./httpService";

const savedBlockService = {
  listSavedBlocks: async (storeId) => {
    try {
      const res = await httpService.get(`/stores/${storeId}/saved-blocks`);
      return res.data || res;
    } catch (error) {
      console.error("Error listing saved blocks:", error);
      throw error;
    }
  },

  getSavedBlockUsageCount: async (storeId, blockId) => {
    try {
      const res = await httpService.get(`/stores/${storeId}/saved-blocks/${blockId}/usage-count`);
      return res.data || res;
    } catch (error) {
      console.error("Error fetching saved block usage count:", error);
      throw error;
    }
  },

  createSavedBlock: async (storeId, { name, category, componentJson, isSynced, isGlobalComponent }) => {
    try {
      const res = await httpService.post(`/stores/${storeId}/saved-blocks`, {
        name,
        category,
        componentJson,
        isSynced,
        isGlobalComponent,
      });
      return res.data || res;
    } catch (error) {
      console.error("Error creating saved block:", error);
      throw error;
    }
  },

  deleteSavedBlock: async (storeId, blockId) => {
    try {
      const res = await httpService.delete(`/stores/${storeId}/saved-blocks/${blockId}`);
      return res.data || res;
    } catch (error) {
      console.error("Error deleting saved block:", error);
      throw error;
    }
  },
};

export default savedBlockService;
