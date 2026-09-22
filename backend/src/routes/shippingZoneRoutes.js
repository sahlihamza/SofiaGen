const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  addShippingZone,
  getAllShippingZones,
  updateShippingZone,
  deleteShippingZone,
  reorderShippingZones,
  addShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  reorderShippingMethods,
  getAvailableCarriers,
} = require("../controller/shippingZoneController");


router.post("/add", addShippingZone);

router.get("/", getAllShippingZones);

router.get("/carriers/available", getAvailableCarriers);

// reorder shipping zones (must come before "/:id" so "reorder" isn't read as an id)
router.patch("/reorder", reorderShippingZones);

// update shipping zone
router.put("/:id", updateShippingZone);

// delete shipping zone
router.delete("/:id", deleteShippingZone);

// shipping methods within a zone
router.post("/:zoneId/methods", addShippingMethod);
// must come before "/:zoneId/methods/:methodId" so "reorder" isn't read as a methodId
router.patch("/:zoneId/methods/reorder", reorderShippingMethods);
router.put("/:zoneId/methods/:methodId", updateShippingMethod);
router.delete("/:zoneId/methods/:methodId", deleteShippingMethod);

module.exports = router;
