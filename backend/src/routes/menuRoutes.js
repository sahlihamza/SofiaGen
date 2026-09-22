const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const menuController = require("../controller/menuController");
const { isAuth, loadUser, requirePermission } = require("../middleware/auth");

router.post("/menus", isAuth, loadUser, requirePermission(getCode("Menus", "create")), menuController.createMenu);
router.get("/stores/:storeId/menus", menuController.getMenusByStore); // public
router.get("/menus/:id", isAuth, loadUser, requirePermission(getCode("Menus", "view")), menuController.getMenuById);
router.put("/menus/:id", isAuth, loadUser, requirePermission(getCode("Menus", "update")), menuController.updateMenu);
router.delete("/menus/:id", isAuth, loadUser, requirePermission(getCode("Menus", "delete")), menuController.deleteMenu);
router.post("/menus/:id/duplicate", isAuth, loadUser, requirePermission(getCode("Menus", "duplicate")), menuController.duplicateMenu);

module.exports = router;
