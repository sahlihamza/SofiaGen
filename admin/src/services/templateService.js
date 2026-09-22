import httpService from "./httpService";

const templateService = {
  listTemplates: async (storeId) => {
    try {
      const res = await httpService.get(`/stores/${storeId}/templates`);
      return res.data || res;
    } catch (error) {
      console.error("Error listing templates:", error);
      throw error;
    }
  },

  createTemplate: async (storeId, { name, category, projectData, compiledHtml, compiledCss }) => {
    try {
      const res = await httpService.post(`/stores/${storeId}/templates`, {
        name,
        category,
        projectData,
        compiledHtml,
        compiledCss,
      });
      return res.data || res;
    } catch (error) {
      console.error("Error creating template:", error);
      throw error;
    }
  },

  deleteTemplate: async (storeId, templateId) => {
    try {
      const res = await httpService.delete(`/stores/${storeId}/templates/${templateId}`);
      return res.data || res;
    } catch (error) {
      console.error("Error deleting template:", error);
      throw error;
    }
  },
};

export default templateService;
