const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { getStoreOwnerDashboard } = require("../controller/storeOwnerDashboardController");

router.get("/", getStoreOwnerDashboard);

module.exports = router;
