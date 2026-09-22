const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const { isAuth } = require("../middleware/auth");
const libraryController = require("../controller/libraryController");

router.get("/stores/:storeId/library/search", isAuth, libraryController.searchLibrary);
router.post("/library/:itemType/:itemId/favorite", isAuth, libraryController.toggleFavorite);

module.exports = router;
