import requests from "@/services/httpService";

const NotificationTemplateService = {
  getAllTemplates: async (category) => {
    return requests.get(`/platform/notification-templates${category ? `?category=${category}` : ""}`);
  },

  getTemplateById: async (id) => {
    return requests.get(`/platform/notification-templates/${id}`);
  },

  createTemplate: async (body) => {
    return requests.post("/platform/notification-templates", body);
  },

  updateTemplate: async (id, body) => {
    return requests.put(`/platform/notification-templates/${id}`, body);
  },

  deleteTemplate: async (id) => {
    return requests.delete(`/platform/notification-templates/${id}`);
  },
};

export default NotificationTemplateService;
