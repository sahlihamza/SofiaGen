const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const overageController = require("../controller/overageController");

// P6  Overage Billing

// Calculate overage (no write)
router.post("/calculate", requirePermission(getCode("Platform Plan", "view")), overageController.calculateOverage);

// Generate overage invoice
router.post("/generate-invoice", requirePermission(getCode("Platform Plan", "update")), overageController.generateOverageInvoice);

// List rules
router.get("/", requirePermission(getCode("Platform Plan", "view")), overageController.getOverages);

// Get one rule
router.get("/:id", requirePermission(getCode("Platform Plan", "view")), overageController.getOverage);

// Create a rule
router.post("/", requirePermission(getCode("Platform Plan", "create")), overageController.createOverage);

// Update a rule
router.put("/:id", requirePermission(getCode("Platform Plan", "update")), overageController.updateOverage);

// Update status
router.patch("/:id/status", requirePermission(getCode("Platform Plan", "update")), overageController.updateOverageStatus);

// Delete a rule
router.delete("/:id", requirePermission(getCode("Platform Plan", "delete")), overageController.deleteOverage);

const quotaOpsService = require("../service/quotaOpsService");

const waiveError = (res, err) => {
  if (err.code === "BAD_REQUEST") return res.status(400).json({ success: false, code: err.code, message: err.message });
  if (err.code === "NOT_FOUND") return res.status(404).json({ success: false, code: err.code, message: err.message });
  if (err.code === "CONFLICT") return res.status(409).json({ success: false, code: err.code, message: err.message });
  return res.status(500).json({ success: false, message: err.message });
};

router.post(
  "/:id/waive",
  requirePermission(getCode("Platform Plan", "update")),
  async (req, res) => {
    try {
      const result = await quotaOpsService.waiveOverage(req.params.id, {
        subscriptionId: req.body?.subscriptionId,
        periodStart: req.body?.periodStart,
        periodEnd: req.body?.periodEnd,
        reason: req.body?.reason,
        actorId: req.user?._id || null,
      });
      return res.status(200).json({ success: true, message: "Surconsommation exoneree", data: result });
    } catch (err) {
      return waiveError(res, err);
    }
  }
);

module.exports = router;
