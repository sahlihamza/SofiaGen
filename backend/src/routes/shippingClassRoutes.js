const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  getAllShippingClasses,
  addShippingClass,
  updateShippingClass,
  deleteShippingClass,
} = require("../controller/shippingClassController");

router.get("/", getAllShippingClasses);
router.post("/add", addShippingClass);
router.put("/:id", updateShippingClass);
router.delete("/:id", deleteShippingClass);

module.exports = router;
