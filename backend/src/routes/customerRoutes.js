const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  loginCustomer,
  registerCustomer,
  verifyPhoneNumber,
  signUpWithProvider,
  signUpWithOauthProvider,
  verifyEmailAddress,
  forgetPassword,
  changePassword,
  resetPassword,
  addCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  deleteManyCustomers,
  restoreCustomer,
  blockCustomer,
  unblockCustomer,
  addAllCustomers,
  addShippingAddress,
  getShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
} = require("../controller/customerController");
const {
  passwordVerificationLimit,
  emailVerificationLimit,
  phoneVerificationLimit,
} = require("../lib/email-sender/sender");
const { isAuth, loadUser, resolveAuthorizationContext } = require("../middleware/auth");

const adminAuth = [isAuth, loadUser, resolveAuthorizationContext];

//verify email
router.post("/verify-email", emailVerificationLimit, verifyEmailAddress);

//verify phone number
router.post("/verify-phone", phoneVerificationLimit, verifyPhoneNumber);

// shipping address send to array
router.post("/shipping/address/:id", addShippingAddress);

// get all shipping address
router.get("/shipping/address/:id", getShippingAddress);

// shipping address update
router.put("/shipping/address/:userId/:shippingId", updateShippingAddress);

// shipping address delete
router.delete("/shipping/address/:userId/:shippingId", deleteShippingAddress);

//register a user
router.post("/register/:token", registerCustomer);

//login a user
router.post("/login", loginCustomer);

//register or login with google and fb
router.post("/signup/oauth", signUpWithOauthProvider);

//register or login with google and fb
router.post("/signup/:token", signUpWithProvider);

//forget-password
router.put("/forget-password", passwordVerificationLimit, forgetPassword);

//reset-password
router.put("/reset-password", resetPassword);

//change password
router.post("/change-password", changePassword);

//add all users
router.post("/add/all", adminAuth, addAllCustomers);

//add a customer
router.post("/add", adminAuth, addCustomer);

//soft delete many customers
router.patch("/delete/many", adminAuth, deleteManyCustomers);

//get all customers (search, filters, pagination)
router.get("/", adminAuth, getAllCustomers);

//add a customer (REST style)
router.post("/", adminAuth, addCustomer);

//get a user
router.get("/:id", adminAuth, getCustomerById);

//update a user
router.put("/:id", adminAuth, updateCustomer);

//restore a soft deleted customer
router.patch("/:id/restore", adminAuth, restoreCustomer);

//block a customer
router.patch("/:id/block", adminAuth, blockCustomer);

//unblock a customer
router.patch("/:id/unblock", adminAuth, unblockCustomer);

//soft delete a user
router.delete("/:id", adminAuth, deleteCustomer);

module.exports = router;
