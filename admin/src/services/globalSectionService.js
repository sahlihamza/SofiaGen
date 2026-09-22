import httpService from "./httpService";

const globalSectionService = {
  getGlobalSection: async (storeId, type) => {
    try {
      const res = await httpService.get(`/stores/${storeId}/global-sections/${type}`);
      return res.data || res;
    } catch (error) {
      console.error(`Error fetching global section "${type}":`, error);
      throw error;
    }
  },

  updateGlobalSection: async (storeId, type, { projectData, compiledHtml, compiledCss }) => {
    try {
      const res = await httpService.put(`/stores/${storeId}/global-sections/${type}`, {
        projectData,
        compiledHtml,
        compiledCss,
      });
      return res.data || res;
    } catch (error) {
      console.error(`Error updating global section "${type}":`, error);
      throw error;
    }
  },
};

export default globalSectionService;
