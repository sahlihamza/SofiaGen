const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const softLimitController = require("../controller/softLimitController");

// P17  Soft Limits (Warning / Critical / Blocked)

// List soft-limit states
router.get("/", requirePermission(getCode("Platform Plan", "view")), softLimitController.getSoftLimits);

// Summary counts
router.get("/summary", requirePermission(getCode("Platform Plan", "view")), softLimitController.getSoftLimitsSummary);

// List PlanQuota docs with soft-limit thresholds
router.get("/plan-quotas", requirePermission(getCode("Platform Plan", "view")), softLimitController.getPlanQuotasWithSoftLimits);

// Update soft-limit thresholds on a PlanQuota
router.patch("/plan-quotas/:id", requirePermission(getCode("Platform Plan", "update")), softLimitController.updatePlanQuotaSoftLimit);

// Evaluate a store (or a single usage pair)
router.post("/evaluate", requirePermission(getCode("Platform Plan", "view")), softLimitController.evaluateSoftLimits);

// Global sweep (scheduler/admin)
router.post("/evaluate-all", requirePermission(getCode("Platform Plan", "update")), softLimitController.evaluateAllSoftLimits);

module.exports = router;
