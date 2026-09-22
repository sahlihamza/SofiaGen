import requests from "./httpService";

const EmailSettingsServices = {
  getEmailSettings: async (storeId) => {
    return requests.get(`/settings/emails/${storeId}`);
  },

  updateEmailSettings: async (storeId, body) => {
    return requests.put(`/settings/emails/${storeId}`, body);
  },

  toggleNotification: async (storeId, key, enabled) => {
    return requests.patch(
      `/settings/emails/${storeId}/notifications/${key}/toggle`,
      { enabled }
    );
  },

  getTemplate: async (storeId) => {
    return requests.get(`/settings/emails/${storeId}/template`);
  },

  updateTemplate: async (storeId, body) => {
    return requests.put(`/settings/emails/${storeId}/template`, body);
  },

  previewNotification: async (storeId, key, draft) => {
    return requests.post(
      `/settings/emails/${storeId}/notifications/${key}/preview`,
      draft
    );
  },

  sendTestEmail: async (storeId, key, draft, testEmail) => {
    return requests.post(
      `/settings/emails/${storeId}/notifications/${key}/test`,
      { ...draft, testEmail }
    );
  },

  // Store SMTP (MAIL-02)  distinct from the notifications config above.
  // GET never returns a password, only passwordConfigured: true/false.
  getSmtp: async (storeId) => {
    return requests.get(`/settings/emails/${storeId}/smtp`);
  },

  updateSmtp: async (storeId, body) => {
    return requests.put(`/settings/emails/${storeId}/smtp`, body);
  },

  sendSmtpTest: async (storeId, to) => {
    return requests.post(`/settings/emails/${storeId}/smtp/test`, { to });
  },
};

export default EmailSettingsServices;
