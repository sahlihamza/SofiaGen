const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  getAllPickupLocations,
  addPickupLocation,
  updatePickupLocation,
  deletePickupLocation,
} = require("../controller/pickupLocationController");

router.get("/", getAllPickupLocations);
router.post("/add", addPickupLocation);
router.put("/:id", updatePickupLocation);
router.delete("/:id", deletePickupLocation);

module.exports = router;
