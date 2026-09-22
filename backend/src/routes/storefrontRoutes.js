const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { getCurrentStore } = require("../controller/storefrontController");
const resolveStorefrontStore = require("../middleware/resolveStorefrontStore");

// Public storefront endpoints  mounted WITHOUT staff auth (see src/routes.js).
// The store front needs the store it sells for before the visitor has any
// account: every cart call is scoped by that storeId.
router.get("/current", resolveStorefrontStore, getCurrentStore);

module.exports = router;
