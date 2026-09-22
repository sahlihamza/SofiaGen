const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, requirePermission, validateStoreAccess } = require("../middleware/auth");
const templateController = require("../controller/template.controller");

router.get("/stores/:storeId/templates", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Template", "view")), templateController.listTemplates);
router.get("/stores/:storeId/templates/:templateId", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Template", "view")), templateController.getTemplateById);
router.post("/stores/:storeId/templates", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Template", "create")), templateController.createTemplate);
router.post("/stores/:storeId/templates/:templateId/duplicate", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Template", "duplicate")), templateController.duplicateTemplate);
router.put("/stores/:storeId/templates/:templateId", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Template", "update")), templateController.updateTemplate);
router.delete("/stores/:storeId/templates/:templateId", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Template", "delete")), templateController.deleteTemplate);

module.exports = router;
