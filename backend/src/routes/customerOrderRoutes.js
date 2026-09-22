const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  addOrder,
  getOrderById,
  getOrderCustomer,
  cancelOrder,
  reorder,
  createPaymentIntent,
  addRazorpayOrder,
  createOrderByRazorPay,
  sendEmailInvoiceToCustomer,
} = require("../controller/customerOrderController");

const { emailVerificationLimit } = require("../lib/email-sender/sender");
const { createRateLimiter } = require("../middleware/rateLimit");
const checkoutLimiter = createRateLimiter({ max: 30, windowMinutes: 5, keyBy: "ip+store" });

//add a order
router.post("/add", checkoutLimiter, addOrder);

// create stripe payment intent
router.post("/create-payment-intent", checkoutLimiter, createPaymentIntent);

//add razorpay order
router.post("/add/razorpay", checkoutLimiter, addRazorpayOrder);

//add a order by razorpay
router.post("/create/razorpay", checkoutLimiter, createOrderByRazorPay);

// actions du client sur sa commande (littéraux : aucun conflit avec /add,
// /add/razorpay ou /customer/invoice, dont le second segment différe)
router.post("/:id/cancel", cancelOrder);
router.post("/:id/reorder", reorder);

//get a order by id
router.get("/:id", getOrderById);

//get all order by a user
router.get("/", getOrderCustomer);

//#send email invoice to customer
router.post(
  "/customer/invoice",
  emailVerificationLimit,
  sendEmailInvoiceToCustomer
);

module.exports = router;
