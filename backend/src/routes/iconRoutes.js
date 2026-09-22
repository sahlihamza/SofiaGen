const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const iconController = require("../controller/iconController");

router.get("/", iconController.listIcons);
router.get("/:name", iconController.getIcon);
router.post("/", iconController.createIcon);
router.post("/batch", iconController.batchCreateIcons);
router.patch("/:name/favorite", iconController.toggleFavorite);
router.delete("/:name", iconController.deleteIcon);
router.delete("/batch", iconController.deleteManyIcons);

module.exports = router;
