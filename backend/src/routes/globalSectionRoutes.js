const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, requirePermission, validateStoreAccess } = require("../middleware/auth");
const globalSectionController = require("../controller/globalSectionController");

router.get("/stores/:storeId/global-sections/:type", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Sections", "view")), globalSectionController.getGlobalSection);
router.put("/stores/:storeId/global-sections/:type", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Sections", "update")), globalSectionController.updateGlobalSection);

module.exports = router;
