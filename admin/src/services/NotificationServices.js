import requests from "@/services/httpService";

const NotificationServices = {
  addNotification: async (body) => {
    return requests.post("/notification/add", body);
  },

  getAllNotification: async (page) => {
    return requests.get(`/notification?page=${page}`);
  },

  updateStatusNotification: async (id, body) => {
    return requests.put(`/notification/${id}`, body);
  },

  updateManyStatusNotification: async (body) => {
    return requests.patch("/notification/update/many", body);
  },

  deleteNotification: async (id) => {
    return requests.delete(`/notification/${id}`);
  },

  deleteNotificationByProductId: async (id) => {
    return requests.delete(`/notification/product-id/${id}`);
  },

  deleteManyNotification: async (body) => {
    return requests.patch(`/notification/delete/many`, body);
  },

  getMyNotifications: async (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return requests.get(`/notifications${query ? `?${query}` : ""}`);
  },

  getUnreadCount: async () => {
    return requests.get("/notifications/unread-count");
  },

  getNotificationById: async (id) => {
    return requests.get(`/notifications/${id}`);
  },

  markNotificationRead: async (id) => {
    return requests.patch(`/notifications/${id}/read`);
  },

  markAllNotificationsRead: async (storeId) => {
    return requests.patch(`/notifications/read-all${storeId ? `?storeId=${storeId}` : ""}`);
  },

  archiveNotification: async (id) => {
    return requests.patch(`/notifications/${id}/archive`);
  },

  deleteMyNotification: async (id) => {
    return requests.delete(`/notifications/${id}`);
  },
};

export default NotificationServices;
