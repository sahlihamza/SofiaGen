import requests from "../httpService";

const API_PREFIX = "/v1/platform/users";

const userAPI = {
  getAllUsers: async (params = {}) => {
    return requests.get(API_PREFIX, params);
  },

  getUserById: async (id) => {
    return requests.get(`${API_PREFIX}/${id}`);
  },

  createUser: async (body) => {
    return requests.post(API_PREFIX, body);
  },

  updateUser: async (id, body) => {
    return requests.patch(`${API_PREFIX}/${id}`, body);
  },

  deleteUser: async (id) => {
    return requests.delete(`${API_PREFIX}/${id}`);
  },

  suspendUser: async (id, reason) => {
    return requests.post(`${API_PREFIX}/${id}/suspend`, { reason });
  },

  reactivateUser: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/reactivate`);
  },

  resetPassword: async (id, password) => {
    return requests.post(`${API_PREFIX}/${id}/reset-password`, { password });
  },

  reset2FA: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/2fa/reset`);
  },

  logoutAllDevices: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/logout-all-devices`);
  },

  revokeSessions: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/revoke-sessions`);
  },

  assignRole: async (id, roleId) => {
    return requests.post(`${API_PREFIX}/${id}/roles`, { roleId });
  },

  removeRole: async (id, roleId) => {
    return requests.delete(`${API_PREFIX}/${id}/roles/${roleId}`);
  },

  bulkAction: async (userIds, action, data = {}) => {
    return requests.post(`${API_PREFIX}/bulk/${action}`, { userIds, ...data });
  },

  getUserActivity: async (id) => {
    return requests.get(`${API_PREFIX}/${id}/activity`);
  },

  getUserPermissions: async (id) => {
    return requests.get(`${API_PREFIX}/${id}/permissions`);
  },

  getUserSessions: async (id) => {
    return requests.get(`${API_PREFIX}/${id}/sessions`);
  },

  logoutDevice: async (id, sessionId) => {
    return requests.post(`${API_PREFIX}/${id}/sessions/${sessionId}/logout`);
  },

  blockUser: async (id, reason) => {
    return requests.post(`${API_PREFIX}/${id}/block`, { reason });
  },

  unblockUser: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/unblock`);
  },

  archiveUser: async (id, reason) => {
    return requests.post(`${API_PREFIX}/${id}/archive`, { reason });
  },

  unarchiveUser: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/unarchive`);
  },

  impersonateUser: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/impersonate`);
  },

  duplicateUser: async (id, body) => {
    return requests.post(`${API_PREFIX}/${id}/duplicate`, body);
  },

  resendInvitation: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/resend-invitation`);
  },

  forcePasswordChange: async (id, password = null) => {
    return requests.post(`${API_PREFIX}/${id}/force-password-change`, { password });
  },

  sendSetupEmail: async (id) => {
    return requests.post(`${API_PREFIX}/${id}/send-setup-email`);
  },

  getUserLoginHistory: async (id, params = {}) => {
    return requests.get(`${API_PREFIX}/${id}/login-history`, params);
  },

  getAllLoginHistory: async (params = {}) => {
    return requests.get(`${API_PREFIX}/login-history`, params);
  },

  getDashboardStats: async () => {
    return requests.get(`${API_PREFIX}/dashboard/stats`);
  },

  getUserProfile: async (id) => {
    return requests.get(`${API_PREFIX}/${id}/profile`);
  },

  getInvitations: async (params = {}) => {
    return requests.get("/v1/platform/invitations", params);
  },

  createInvitation: async (body) => {
    return requests.post("/v1/platform/invitations", body);
  },

  resendInvitationByToken: async (invitationId) => {
    return requests.post(`/v1/platform/invitations/${invitationId}/resend`);
  },

  cancelInvitation: async (invitationId) => {
    return requests.post(`/v1/platform/invitations/${invitationId}/cancel`);
  },

  revokeInvitation: async (invitationId) => {
    return requests.post(`/v1/platform/invitations/${invitationId}/revoke`);
  },

  deleteInvitation: async (invitationId) => {
    return requests.delete(`/v1/platform/invitations/${invitationId}`);
  },

  getTeams: async (params = {}) => {
    return requests.get("/v1/platform/teams", params);
  },

  getTeamById: async (id) => {
    return requests.get(`/v1/platform/teams/${id}`);
  },

  createTeam: async (body) => {
    return requests.post("/v1/platform/teams", body);
  },

  updateTeam: async (id, body) => {
    return requests.put(`/v1/platform/teams/${id}`, body);
  },

  archiveTeam: async (id) => {
    return requests.post(`/v1/platform/teams/${id}/archive`);
  },

  deleteTeam: async (id) => {
    return requests.delete(`/v1/platform/teams/${id}`);
  },

  unarchiveTeam: async (id) => {
    return requests.post(`/v1/platform/teams/${id}/unarchive`);
  },

  addTeamMember: async (teamId, userId) => {
    return requests.post(`/v1/platform/teams/${teamId}/members`, { userId });
  },

  removeTeamMember: async (teamId, userId) => {
    return requests.delete(`/v1/platform/teams/${teamId}/members/${userId}`);
  },
};

export default userAPI;