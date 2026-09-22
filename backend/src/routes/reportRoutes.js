const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getMrr,
  getArr,
  getRevenue,
  getPlansReport,
  getChurnReport,
  getTrialsReport,
  getPaymentsReport,
} = require("../controller/reportController");

// Reports routes (mounted with isAuth + loadUser in routes.js)
router.get("/mrr", getMrr);
router.get("/arr", getArr);
router.get("/revenue", getRevenue);
router.get("/plans", getPlansReport);
router.get("/churn", getChurnReport);
router.get("/trials", getTrialsReport);
router.get("/payments", getPaymentsReport);

module.exports = router;
