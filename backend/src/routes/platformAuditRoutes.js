const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  isAuth,
  loadUser,
  requirePermission,
  requireSuperAdmin,
  scopeQueryToOwnStore,
} = require("../middleware/auth");
const {
  getAuditLogs,
  getAuditLogById,
  getUserActivityLog,
  getResourceAuditLog,
  exportAuditLogs,
  requestAsyncExport,
  getExportStatus,
  downloadExport,
  cleanupOldLogs,
  getAuditStats,
  getByRequestId,
} = require("../controller/platformAuditController");

router.use(isAuth, loadUser);

// AUDIT-3/AUDIT-SECURITY-1: Super Admin sees every store; anyone else with
// audit.view is force-scoped to their own store by scopeQueryToOwnStore.
router.get("/", requirePermission(getCode("Audit", "view")), scopeQueryToOwnStore, getAuditLogs);
router.get("/stats", requirePermission(getCode("Audit", "view")), scopeQueryToOwnStore, getAuditStats);
router.get("/by-user/:userId", requirePermission(getCode("Audit", "view")), getUserActivityLog);
router.get("/by-resource/:resourceType/:resourceId", requirePermission(getCode("Audit", "view")), getResourceAuditLog);
router.get("/by-request/:requestId", requirePermission(getCode("Audit", "view")), getByRequestId);

// AUDIT-EXPORT-1: async export  request, poll status, download once ready.
// Routes must come before the "/:logId" catch-all below.
router.post("/exports", requirePermission(getCode("Audit", "export")), requestAsyncExport);
router.get("/exports/:jobId", requirePermission(getCode("Audit", "export")), getExportStatus);
router.get("/exports/:jobId/download", requirePermission(getCode("Audit", "export")), downloadExport);

router.post("/export", requirePermission(getCode("Audit", "export")), exportAuditLogs);

router.get("/:logId", requirePermission(getCode("Audit", "view")), getAuditLogById);

// Cleanup is a destructive, platform-wide operation  Super Admin only,
// regardless of who else holds audit.manage.
router.delete("/cleanup", requireSuperAdmin, cleanupOldLogs);

module.exports = router;
