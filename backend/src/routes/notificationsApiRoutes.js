const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getMyNotifications,
  getUnreadCount,
  getNotificationDetail,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  deleteMyNotification,
} = require("../controller/notificationController");

router.get("/unread-count", getUnreadCount);
router.get("/", getMyNotifications);
router.get("/:id", getNotificationDetail);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.patch("/:id/archive", archiveNotification);
router.delete("/:id", deleteMyNotification);

module.exports = router;
