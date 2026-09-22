const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const quotaTypeController = require("../controller/quotaTypeController");

router.get("/", requirePermission(getCode("Platform Plan", "view")), quotaTypeController.getQuotaTypes);
router.get("/:id", requirePermission(getCode("Platform Plan", "view")), quotaTypeController.getQuotaTypeById);
router.post("/", requirePermission(getCode("Platform Plan", "create")), quotaTypeController.createQuotaType);
router.put("/:id", requirePermission(getCode("Platform Plan", "update")), quotaTypeController.updateQuotaType);
router.delete("/:id", requirePermission(getCode("Platform Plan", "delete")), quotaTypeController.deleteQuotaType);

module.exports = router;
