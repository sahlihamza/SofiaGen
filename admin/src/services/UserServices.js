import requests from "./httpService";

const UserServices = {
  registerAdmin: async (body) => {
    return requests.post("/auth/register", body);
  },
  login: async (body) => {
    return requests.post("/auth/login", body);
  },

  googleLogin: async (body) => {
    return requests.post("/auth/google-login", body);
  },

  // Public  no auth token exists yet for someone accepting an invitation.
  // Handles both platform and store invitations (the backend branches on
  // the invitation's own storeId).
  acceptInvitation: async (body) => {
    return requests.post("/v1/platform/invitations/accept", body);
  },

  getStaff: async () => {
    return requests.get("/user/staff");
  },

  searchUsers: async (q) => {
    return requests.get(`/user/search?q=${encodeURIComponent(q || "")}`);
  },

  getStaffById: async (id) => {
    return requests.get(`/user/staff/${id}`);
  },

  addStaff: async (body) => {
    return requests.post("/user/staff", body);
  },

  updateStaff: async (id, body) => {
    return requests.put(`/user/staff/${id}`, body);
  },

  updateStaffStatus: async (id, body) => {
    return requests.put(`/user/staff/${id}/status`, body);
  },

  assignRoles: async (id, body) => {
    return requests.patch(`/user/${id}/assign-roles`, body);
  },

  deleteStaff: async (id) => {
    return requests.delete(`/user/staff/${id}`);
  },

  blockUser: async (id, body) => {
    return requests.post(`/user/${id}/block`, body);
  },

  unblockUser: async (id) => {
    return requests.post(`/user/${id}/unblock`);
  },

  suspendUser: async (id, body) => {
    return requests.post(`/user/${id}/suspend`, body);
  },

  activateUser: async (id) => {
    return requests.post(`/user/${id}/activate`);
  },

  archiveUser: async (id, body) => {
    return requests.post(`/user/${id}/archive`, body);
  },

  unarchiveUser: async (id) => {
    return requests.post(`/user/${id}/unarchive`);
  },

  resetPassword: async (id, body) => {
    return requests.post(`/user/${id}/reset-password`, body);
  },

  resendInvitation: async (id) => {
    return requests.post(`/user/${id}/resend-invitation`);
  },

  resendPasswordEmail: async (id) => {
    return requests.post(`/user/${id}/resend-password-email`);
  },

  forcePasswordChange: async (id, body) => {
    return requests.post(`/user/${id}/force-password-change`, body);
  },

  enable2FA: async (id) => {
    return requests.post(`/user/${id}/2fa/enable`);
  },

  disable2FA: async (id) => {
    return requests.post(`/user/${id}/2fa/disable`);
  },

  getUserSessions: async (id) => {
    return requests.get(`/user/${id}/sessions`);
  },

  revokeAllSessions: async (id) => {
    return requests.post(`/user/${id}/sessions/revoke-all`);
  },

  logoutDevice: async (id, sessionId) => {
    return requests.post(`/user/${id}/sessions/${sessionId}/logout`);
  },

  getUserLoginHistory: async (id, params = {}) => {
    return requests.get(`/user/${id}/login-history`, params);
  },

  getUserActivity: async (id, params = {}) => {
    return requests.get(`/user/${id}/activity`, params);
  },

  getUserPermissions: async (id) => {
    return requests.get(`/user/${id}/permissions`);
  },

  getUserProfile: async (id) => {
    return requests.get(`/user/${id}/profile`);
  },

  impersonateUser: async (id) => {
    return requests.post(`/user/${id}/impersonate`);
  },

  duplicateUser: async (id, body) => {
    return requests.post(`/user/${id}/duplicate`, body);
  },

  exportUser: async (id, params = {}) => {
    return requests.get(`/user/${id}/export`, params);
  },

  logout: async () => {
    return requests.post("/auth/logout");
  },

  refreshToken: async () => {
    return requests.post("/auth/refresh-token");
  },

  forgotPassword: async (body) => {
    return requests.post("/auth/forgot-password", body);
  },

  resetPassword: async (token, body) => {
    return requests.post(`/auth/reset-password/${token}`, body);
  },

  getProfile: async () => {
    return requests.get("/user/profile");
  },

  updateProfile: async (body) => {
    return requests.put("/user/profile", body);
  },

  updateProfileImage: async (body) => {
    return requests.patch("/user/profile/image", body);
  },

  changePassword: async (body) => {
    return requests.put("/user/profile/password", body);
  },

  getMyStores: async () => {
    return requests.get("/user/stores");
  },

  selectMyStore: async (body) => {
    return requests.patch("/user/stores/select", body);
  },

  deselectMyStore: async () => {
    return requests.delete("/user/stores/select");
  },

  // Bulk actions
  bulkActivate: async (ids) => {
    return requests.post("/user/bulk/activate", { ids });
  },

  bulkDeactivate: async (ids) => {
    return requests.post("/user/bulk/deactivate", { ids });
  },

  bulkBlock: async (ids, body) => {
    return requests.post("/user/bulk/block", { ids, ...body });
  },

  bulkUnblock: async (ids) => {
    return requests.post("/user/bulk/unblock", { ids });
  },

  bulkSuspend: async (ids, body) => {
    return requests.post("/user/bulk/suspend", { ids, ...body });
  },

  bulkArchive: async (ids) => {
    return requests.post("/user/bulk/archive", { ids });
  },

  bulkDelete: async (ids) => {
    return requests.post("/user/bulk/delete", { ids });
  },

  bulkResetPassword: async (ids) => {
    return requests.post("/user/bulk/reset-password", { ids });
  },

  bulkResendInvitation: async (ids) => {
    return requests.post("/user/bulk/resend-invitation", { ids });
  },

  bulkExport: async (ids) => {
    return requests.post("/user/bulk/export", { ids });
  },

  bulkAssignRole: async (ids, roleId) => {
    return requests.post("/user/bulk/role-assign", { ids, roleId });
  },

  bulkEnable2FA: async (ids) => {
    return requests.post("/user/bulk/enable-2fa", { ids });
  },

  bulkDisable2FA: async (ids) => {
    return requests.post("/user/bulk/disable-2fa", { ids });
  },

  // loginAdmin: async (body) => {
  //   return requests.post(`/admin/login`, body);
  // },

  // forgetPassword: async (body) => {
  //   return requests.put("/admin/forget-password", body);
  // },

  // resetPassword: async (body) => {
  //   return requests.put("/admin/reset-password", body);
  // },

  // signUpWithProvider: async (body) => {
  //   return requests.post("/admin/signup", body);
  // },

  // getAllStaff: async (body) => {
  //   return requests.get("/admin", body);
  // },
  // getStaffById: async (id, body) => {
  //   return requests.post(`/admin/${id}`, body);
  // },

  // updateStaff: async (id, body) => {
  //   return requests.put(`/admin/${id}`, body);
  // },

};

export default UserServices;