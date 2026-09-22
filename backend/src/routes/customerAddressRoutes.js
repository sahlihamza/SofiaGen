const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  addAddress,
  getAddressesByCustomer,
  getDefaultAddress,
  getAddressById,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} = require("../controller/customerAddressController");

// add address
router.post("/add", addAddress);

// add address (REST style)
router.post("/", addAddress);

// get every address of a customer
router.get("/customer/:customerId", getAddressesByCustomer);

// get the default address of a customer (?type=billing|shipping|other)
router.get("/customer/:customerId/default", getDefaultAddress);

// get address by id
router.get("/:id", getAddressById);

// update address
router.put("/:id", updateAddress);

// set address as default for its type
router.patch("/:id/default", setDefaultAddress);

// delete address
router.delete("/:id", deleteAddress);

module.exports = router;
