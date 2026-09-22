const express = require("express");
const { getCode } = require("../config/rbac/permissionCodes");
const {
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission,
} = require("../middleware/auth");
const router = express.Router();
const {
  getAllNotification,
  addNotification,
  updateStatusNotification,
  deleteNotificationById,
  deleteNotificationByProductId,
  deleteManyNotification,
  updateManyStatusNotification,
} = require("../controller/notificationController");

router.use(isAuth, loadUser, resolveAuthorizationContext);

// add a notification on database
router.post("/add", requirePermission(getCode("Notifications", "manage")), addNotification);

// get all notification
router.get("/", requirePermission(getCode("Notifications", "view")), getAllNotification);

// update notification status
router.put("/:id", requirePermission(getCode("Notifications", "update")), updateStatusNotification);

// update many
router.patch("/update/many", requirePermission(getCode("Notifications", "update")), updateManyStatusNotification);

// delete notification by id
router.delete("/:id", requirePermission(getCode("Notifications", "delete")), deleteNotificationById);

// delete notification by product id
router.delete("/product-id/:id", requirePermission(getCode("Notifications", "delete")), deleteNotificationByProductId);

// delete many
router.patch("/delete/many", requirePermission(getCode("Notifications", "delete")), deleteManyNotification);

module.exports = router;
