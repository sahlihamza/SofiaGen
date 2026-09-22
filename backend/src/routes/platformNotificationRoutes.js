const express = require("express");
const { getCode } = require("../config/rbac/permissionCodes");
const {
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission,
} = require("../middleware/auth");
const {
  getOverview,
  getEvents,
  getTemplates,
  createTemplate,
  updateTemplate,
  getChannels,
  updateChannel,
  getDeliveries,
  getLogs,
  getAnalytics,
} = require("../controller/platformNotificationController");

const router = express.Router();

router.use(isAuth, loadUser, resolveAuthorizationContext);

router.get("/", requirePermission(getCode("Platform Notification", "view")), getOverview);
router.get("/events", requirePermission(getCode("Platform Notification", "events_view") || getCode("Platform Notification", "view")), getEvents);
router.get("/templates", requirePermission(getCode("Platform Notification", "templates_view") || getCode("Platform Notification", "view")), getTemplates);
router.post("/templates", requirePermission(getCode("Platform Notification", "templates_manage") || getCode("Platform Notification", "manage")), createTemplate);
router.put("/templates/:id", requirePermission(getCode("Platform Notification", "templates_manage") || getCode("Platform Notification", "manage")), updateTemplate);
router.get("/channels", requirePermission(getCode("Platform Notification", "channels_view") || getCode("Platform Notification", "view")), getChannels);
router.put("/channels/:id", requirePermission(getCode("Platform Notification", "channels_manage") || getCode("Platform Notification", "manage")), updateChannel);
router.get("/deliveries", requirePermission(getCode("Platform Notification", "logs_view") || getCode("Platform Notification", "view")), getDeliveries);
router.get("/logs", requirePermission(getCode("Platform Notification", "logs_view") || getCode("Platform Notification", "view")), getLogs);
router.get("/analytics", requirePermission(getCode("Platform Notification", "analytics_view") || getCode("Platform Notification", "view")), getAnalytics);

module.exports = router;
