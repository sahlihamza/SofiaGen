const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  getAllStockReservations,
  getReservationsByOrder,
  releaseOrderReservations,
  consumeOrderReservations,
} = require("../controller/stockReservationController");

//get all stock reservations
router.get("/", getAllStockReservations);

//get the reservations of an order
router.get("/order/:orderId", getReservationsByOrder);

//give the units of an order back to the catalogue
router.put("/order/:orderId/release", releaseOrderReservations);

//close the holds of an order that shipped
router.put("/order/:orderId/consume", consumeOrderReservations);

// No POST and no DELETE on purpose: a reservation row exists because units
// were actually taken out of the catalogue. Creating one by hand would claim a
// hold that doesn't exist, deleting one would lose units nobody gives back 
// releasing is the way out, and it keeps the trace.

module.exports = router;
