const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getAllInvitations,
  getInvitation,
  createInvitation,
  resendInvitation,
  cancelInvitation,
  deleteInvitation,
  revokeInvitation,
  acceptInvitation,
} = require("../controller/invitationController");
const {
  isAuth,
  loadUser, resolveAuthorizationContext, requirePermission,
} = require("../middleware/auth");

router.post("/accept", acceptInvitation);

router.use(isAuth, loadUser, resolveAuthorizationContext);

router.get("/", requirePermission(getCode("Platform Invitation", "view")), getAllInvitations);
router.post("/", requirePermission(getCode("Platform Invitation", "create")), createInvitation);

router.get("/:id", requirePermission(getCode("Platform Invitation", "view")), getInvitation);
router.post("/:id/resend", requirePermission(getCode("Platform Invitation", "resend")), resendInvitation);
router.post("/:id/cancel", requirePermission(getCode("Platform Invitation", "revoke")), cancelInvitation);
router.post("/:id/revoke", requirePermission(getCode("Platform Invitation", "revoke")), revokeInvitation);
router.delete("/:id", requirePermission(getCode("Platform Invitation", "revoke")), deleteInvitation);

module.exports = router;
