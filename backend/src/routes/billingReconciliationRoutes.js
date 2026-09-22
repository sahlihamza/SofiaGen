const express = require("express");
const { getCode } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requirePermission } = require("../middleware/auth");
const BillingReconciliationService = require("../service/BillingReconciliationService");

router.get(
  "/anomalies",
  requirePermission(getCode("Platform Billing", "view")),
  async (req, res) => {
    try {
      const report = await BillingReconciliationService.detectAnomalies({
        storeId: req.query.storeId || null,
      });
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code,
        message: err.message,
      });
    }
  }
);

const BillingReportsService = require("../service/BillingReportsService");

router.get(
  "/reports",
  requirePermission(getCode("Platform Billing", "view")),
  async (req, res) => {
    try {
      const report = await BillingReportsService.getReport(req.query.type, {
        storeId: req.query.storeId || null,
        from: req.query.from || null,
        to: req.query.to || null,
      });
      return res.status(200).json({ success: true, ...report });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        code: err.code,
        message: err.message,
        availableTypes: err.code === "UNKNOWN_REPORT_TYPE" || err.code === "REPORT_TYPE_REQUIRED"
          ? BillingReportsService.REPORT_TYPES
          : undefined,
      });
    }
  }
);

module.exports = router;
