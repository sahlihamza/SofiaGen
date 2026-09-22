const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requireFeatureMiddleware } = require("../service/EntitlementService");
const { requestStoreExport, getStoreExportStatus, downloadStoreExport } = require("../controller/storeExportController");

router.post("/", requireFeatureMiddleware("exports"), requestStoreExport);
router.get("/:jobId", getStoreExportStatus);
router.get("/:jobId/download", downloadStoreExport);

module.exports = router;
