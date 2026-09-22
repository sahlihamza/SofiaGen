import requests from "./httpService";

/**
 * PlanAuditLogServices
 *
 * Cible les audit logs enrichis (P18) par plan via
 * `/billing/plans/:planId/audit-log` (controller getPlanAuditLog enrichi).
 */
const PlanAuditLogServices = {
  // Liste des plans actifs (pour le filtre plan)
  getActivePlans: async () => {
    return requests.get("/billing/plans/active/list");
  },

  // Récupère les logs enrichis d'un plan avec filtres + résumé
  getPlanAuditLogs: async (planId, params = {}) => {
    return requests.get(`/billing/plans/${planId}/audit-log`, params);
  },

  // Alias générique (permet de couvrir "tous les plans" côte front)
  getAllAuditLogs: async (planId, params = {}) => {
    return requests.get(`/billing/plans/${planId}/audit-log`, params);
  },

  // Export JSON (client-side helper)
  toJson: (logs) => JSON.stringify(logs, null, 2),
};

export default PlanAuditLogServices;
