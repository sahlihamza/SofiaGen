import requests from "./httpService";

const PlanTemplateServices = {
  // List templates (P14)
  getPlanTemplates: async (params = {}) => {
    return requests.get("/platform/plan-templates", params);
  },

  // Get one template
  getPlanTemplate: async (id) => {
    return requests.get(`/platform/plan-templates/${id}`);
  },

  // Create a template
  createPlanTemplate: async (body) => {
    return requests.post("/platform/plan-templates", body);
  },

  // Update a template
  updatePlanTemplate: async (id, body) => {
    return requests.put(`/platform/plan-templates/${id}`, body);
  },

  // Clone a template
  clonePlanTemplate: async (id, body = {}) => {
    return requests.post(`/platform/plan-templates/${id}/clone`, body);
  },

  // Instantiate a template into a real Plan
  instantiatePlanTemplate: async (id, body = {}) => {
    return requests.post(`/platform/plan-templates/${id}/instantiate`, body);
  },

  // Delete a template
  deletePlanTemplate: async (id) => {
    return requests.delete(`/platform/plan-templates/${id}`);
  },
};

export default PlanTemplateServices;
