const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const dynamicDataController = require("../controller/dynamicDataController");

router.get("/dynamic-data-sources", dynamicDataController.listDynamicDataSources);
router.get("/stores/:storeId/dynamic-data-preview", dynamicDataController.previewDynamicData);

module.exports = router;
