const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getMyStats,
  getMyOrders,
  updateMyAvailability,
} = require("../controller/riderAppController");

router.get("/stats", getMyStats);
router.get("/orders", getMyOrders);
router.put("/availability", updateMyAvailability);

module.exports = router;
