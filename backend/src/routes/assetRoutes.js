const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const multer = require("multer");
const { isAuth, loadUser, resolveAuthorizationContext, requirePermission } = require("../middleware/auth");
const assetController = require("../controller/assetController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// SFG-80: this used to gate EVERY path with an unconditional router.use()
// while mounted at bare "/api" (see routes.js)  any request whose path
// didn't match one of this router's own three routes still got stopped
// here (401 from isAuth) before ever reaching whatever real router is
// registered after it in routes.js (countries, shipping-zones, settings/
// accounts-privacy...). Each route now carries its own auth chain instead.
router.post("/upload", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Media", "upload")), upload.single("file"), assetController.uploadAsset);
router.get("/", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Media", "view")), assetController.listAssets);
router.delete("/:assetId", isAuth, loadUser, resolveAuthorizationContext, requirePermission(getCode("Media", "delete")), assetController.deleteAsset);

module.exports = router;
