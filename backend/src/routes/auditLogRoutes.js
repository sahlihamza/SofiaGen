const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { getAuditLogs } = require("../controller/auditLogController");

router.get("/", getAuditLogs);
const { listAuditLog } = require("../controller/auditLogController");

router.get("/:storeId", listAuditLog);

module.exports = router;
