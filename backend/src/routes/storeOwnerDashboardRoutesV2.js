const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const { requireStoreAccess } = require("../middleware/auth");
const router = express.Router();
const { getStoreOwnerDashboardV2, getStoreOwnerDashboardWidget, refreshStoreOwnerDashboard } = require("../controller/storeOwnerDashboardControllerV2");

// SO-19: every builder below reads req.currentStoreId directly, which isAuth
// sets straight from the "company" header with zero membership check  any
// authenticated user could view another store's full dashboard (orders,
// customers, revenue) just by sending that store's id in the header. This
// mirrors the requireOrderStoreAccess() pattern: pin the access check to the
// same storeId source the controllers actually read.
const requireDashboardStoreAccess = requireStoreAccess({
  source: (req) => req.currentStoreId || req.user?.currentStoreId,
});

router.get("/", requireDashboardStoreAccess, getStoreOwnerDashboardV2);
router.get("/widget/:widget", requireDashboardStoreAccess, getStoreOwnerDashboardWidget);
router.post("/refresh", requireDashboardStoreAccess, refreshStoreOwnerDashboard);

module.exports = router;
