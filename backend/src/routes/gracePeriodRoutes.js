const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const gracePeriodController = require("../controller/gracePeriodController");

router.post("/", requirePermission(getCode("Platform Plan", "update")), gracePeriodController.createGracePeriod);

router.get("/", requirePermission(getCode("Platform Plan", "view")), gracePeriodController.getGracePeriods);

router.get("/:id", requirePermission(getCode("Platform Plan", "view")), gracePeriodController.getGracePeriodById);

router.patch("/:id/resolve", requirePermission(getCode("Platform Plan", "update")), gracePeriodController.resolveGracePeriod);

router.patch("/:id/escalate", requirePermission(getCode("Platform Plan", "update")), gracePeriodController.escalateGracePeriod);

router.post("/expire", requirePermission(getCode("Platform Plan", "update")), gracePeriodController.expireGracePeriods);

router.get("/active", requirePermission(getCode("Platform Plan", "view")), gracePeriodController.getActiveGracePeriods);

const quotaOpsService = require("../service/quotaOpsService");

const opsError = (res, err) => {
  if (err.code === "BAD_REQUEST") return res.status(400).json({ success: false, code: err.code, message: err.message });
  if (err.code === "NOT_FOUND") return res.status(404).json({ success: false, code: err.code, message: err.message });
  if (err.code === "CONFLICT") return res.status(409).json({ success: false, code: err.code, message: err.message });
  return res.status(500).json({ success: false, message: err.message });
};

router.post(
  "/:id/extend",
  requirePermission(getCode("Platform Plan", "update")),
  async (req, res) => {
    try {
      const grace = await quotaOpsService.extendGracePeriod(req.params.id, {
        days: req.body?.days,
        reason: req.body?.reason,
        actorId: req.user?._id || null,
      });
      return res.status(200).json({ success: true, message: "Periode de grace prolongee", data: grace });
    } catch (err) {
      return opsError(res, err);
    }
  }
);

module.exports = router;
