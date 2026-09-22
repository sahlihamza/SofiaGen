const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const assetFolderController = require("../controller/assetFolderController");

const router = express.Router();

// SFG-80: same fix as assetRoutes.js  no unconditional router.use() while
// mounted at bare "/api", or every path registered after this router in
// routes.js (countries, shipping-zones, settings/accounts-privacy...) gets
// gated by a router that was never meant to handle them.
router.get("/folders", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Media", "view")), assetFolderController.listFolders);
router.post("/folders", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Media", "create")), assetFolderController.createFolder);
router.delete("/folders/:folderId", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Media", "delete")), assetFolderController.deleteFolder);

module.exports = router;
