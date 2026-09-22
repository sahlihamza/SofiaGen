import requests from './httpService';

const PlanVersionServices = {
  // List versions for a plan (P13)
  getPlanVersions: async (planId, params = {}) => {
    return requests.get(`/platform/plan-versions/plans/${planId}/versions`, params);
  },

  // Get a specific version
  getPlanVersion: async (planId, version) => {
    return requests.get(`/platform/plan-versions/plans/${planId}/versions/${version}`);
  },

  // Manually create a snapshot
  createPlanVersion: async (planId, body = {}) => {
    return requests.post(`/platform/plan-versions/plans/${planId}/versions`, body);
  },

  // Rollback plan to a version
  rollbackPlanVersion: async (planId, version, body = {}) => {
    return requests.post(`/platform/plan-versions/plans/${planId}/versions/${version}/rollback`, body);
  },

  // Delete a version
  deletePlanVersion: async (id) => {
    return requests.delete(`/platform/plan-versions/versions/${id}`);
  },
};

export default PlanVersionServices;
