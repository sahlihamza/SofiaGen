const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth, loadUser, requirePermission, validateStoreAccess } = require("../middleware/auth");
const savedBlockController = require("../controller/savedBlock.controller");

/**
 * ADMIN routes  authenticated, permission basé sur les modules (saved_blocks) + store scope.
 */
router.get("/stores/:storeId/saved-blocks", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Saved Blocks", "view")), savedBlockController.listSavedBlocks);
router.post("/stores/:storeId/saved-blocks", isAuth, loadUser, validateStoreAccess, requirePermission(getCode("Saved Blocks", "create")), savedBlockController.createSavedBlock);
router.put(
  "/stores/:storeId/saved-blocks/:blockId",
  isAuth,
  loadUser,
  validateStoreAccess,
  requirePermission(getCode("Saved Blocks", "update")),
  savedBlockController.updateSavedBlock
);
router.delete(
  "/stores/:storeId/saved-blocks/:blockId",
  isAuth,
  loadUser,
  validateStoreAccess,
  requirePermission(getCode("Saved Blocks", "delete")),
  savedBlockController.deleteSavedBlock
);
router.get(
  "/stores/:storeId/saved-blocks/:blockId/usage-count",
  isAuth,
  loadUser,
  validateStoreAccess,
  requirePermission(getCode("Saved Blocks", "view")),
  savedBlockController.getSavedBlockUsageCount
);

module.exports = router;
