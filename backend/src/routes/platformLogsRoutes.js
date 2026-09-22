const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getSystemLogs,
  getSecurityLogs,
  getWebhookLogs,
  retryWebhook,
  getJobLogs,
  getDashboardStats,
} = require("../controller/platformLogsController");
const { isAuth, loadUser, requirePermission, requireSuperAdmin, scopeQueryToOwnStore } = require("../middleware/auth");

router.use(isAuth, loadUser);

// LOG-5 dashboard
router.get("/dashboard", requirePermission(getCode("Logs", "view")), scopeQueryToOwnStore, getDashboardStats);

// LOG-1/LOG-2 system + API logs
router.get("/system", requirePermission(getCode("Logs", "view")), scopeQueryToOwnStore, getSystemLogs);

// SECURITY-LOG-1  platform-wide visibility only (a store admin should not
// be able to browse other users' security events even within their store).
router.get("/security", requireSuperAdmin, getSecurityLogs);

// LOG-3 webhooks
router.get("/webhooks", requirePermission(getCode("Webhook Logs", "view")), scopeQueryToOwnStore, getWebhookLogs);
router.post("/webhooks/:id/retry", requirePermission(getCode("Webhook Logs", "retry")), retryWebhook);

// LOG-4 jobs  platform-wide only, jobs aren't per-store.
router.get("/jobs", requireSuperAdmin, getJobLogs);

module.exports = router;
