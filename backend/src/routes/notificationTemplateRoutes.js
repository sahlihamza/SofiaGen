const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { requirePermission } = require("../middleware/auth");
const {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require("../controller/notificationTemplateController");

router.get("/", requirePermission(getCode("Notifications", "view")), getAllTemplates);
router.get("/:id", requirePermission(getCode("Notifications", "view")), getTemplateById);
router.post("/", requirePermission(getCode("Notifications", "manage")), createTemplate);
router.put("/:id", requirePermission(getCode("Notifications", "manage")), updateTemplate);
router.delete("/:id", requirePermission(getCode("Notifications", "manage")), deleteTemplate);

module.exports = router;
