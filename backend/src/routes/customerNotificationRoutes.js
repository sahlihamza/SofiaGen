const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requireCustomer } = require("../middleware/customerAuth");
const {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteMyNotification,
} = require("../controller/customerNotificationController");

router.use(requireCustomer);

router.get("/unread-count", getUnreadCount);
router.get("/", getMyNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.delete("/:id", deleteMyNotification);

module.exports = router;
