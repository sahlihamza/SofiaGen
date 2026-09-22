const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  getAllPayments,
  getPaymentsByOrder,
  getPaymentById,
  addPayment,
  updatePaymentStatus,
} = require("../controller/paymentController");

router.get("/", getAllPayments);
// Before "/:id", otherwise "order" is read as an id.
router.get("/order/:orderId", getPaymentsByOrder);
router.get("/:id", getPaymentById);
router.post("/add", addPayment);
router.put("/:id/status", updatePaymentStatus);

// No DELETE on purpose: a payment is an accounting record. Cancelling one is a
// status change ("cancelled"/"refunded"), which keeps the trace.

module.exports = router;
