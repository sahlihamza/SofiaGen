const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getRiders,
  getRiderStats,
  getRiderById,
  getRiderOrders,
  addRider,
  updateRider,
  deleteRider,
  updateRiderStatus,
} = require("../controller/riderController");
const { hasPermission } = require("../middleware/auth");

router.get("/", hasPermission("riders", "view"), getRiders);
router.get("/stats", hasPermission("riders", "view"), getRiderStats);
router.get("/:id", hasPermission("riders", "view"), getRiderById);
router.get("/:id/orders", hasPermission("riders", "view"), getRiderOrders);
router.post("/", hasPermission("riders", "create"), addRider);
router.put("/:id", hasPermission("riders", "update"), updateRider);
router.delete("/:id", hasPermission("riders", "delete"), deleteRider);
router.put("/:id/status", hasPermission("riders", "update"), updateRiderStatus);

module.exports = router;
