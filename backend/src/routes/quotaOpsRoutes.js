const express = require("express");
const { getCode } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const quotaOpsService = require("../service/quotaOpsService");

const opsError = (res, err) => {
  if (err.code === "BAD_REQUEST") return res.status(400).json({ success: false, code: err.code, message: err.message });
  if (err.code === "NOT_FOUND") return res.status(404).json({ success: false, code: err.code, message: err.message });
  if (err.code === "CONFLICT") return res.status(409).json({ success: false, code: err.code, message: err.message });
  return res.status(500).json({ success: false, message: err.message });
};

router.get(
  "/overview",
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission(getCode("Platform Plan", "view")),
  async (req, res) => {
    try {
      const data = await quotaOpsService.getOverview({
        storeId: req.query.storeId,
        page: req.query.page,
        limit: req.query.limit,
      });
      return res.status(200).json({ success: true, ...data });
    } catch (err) {
      return opsError(res, err);
    }
  }
);

module.exports = router;
