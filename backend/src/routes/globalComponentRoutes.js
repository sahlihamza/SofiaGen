// DEPRECATED  Routes GlobalComponent désactivés. Voir routes.js (ligne commenté).
// Système remplac par GlobalSection (globalSectionRoutes.js).
// NE PAS SUPPRIMER  dépéciation réversible.
const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const { isAuth, requirePermission } = require("../middleware/auth");
const gcController = require("../controller/globalComponentController");

// Create
router.post("/global-components", isAuth, requirePermission(getCode("Online Store", "create")), gcController.createGlobalComponent);
// List
router.get("/global-components", isAuth, requirePermission(getCode("Online Store", "view")), gcController.getGlobalComponents);
// Update
router.put("/global-components/:id", isAuth, requirePermission(getCode("Online Store", "update")), gcController.updateGlobalComponent);
// Delete
router.delete("/global-components/:id", isAuth, requirePermission(getCode("Online Store", "delete")), gcController.deleteGlobalComponent);

module.exports = router;
