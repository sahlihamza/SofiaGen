const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  addValue,
  addAllValues,
  getValuesByAttribute,
  getValueById,
  updateValue,
  setAttributeValues,
  deleteValue,
} = require("../controller/attributeValueController");

// add a single value
router.post("/add", addValue);

// add many values
router.post("/add/all", addAllValues);

// replace the full set of values for an attribute
router.put("/attribute/:attributeId", setAttributeValues);

// get all values of an attribute
router.get("/attribute/:attributeId", getValuesByAttribute);

// get a single value by id
router.get("/:id", getValueById);

// update a single value
router.put("/:id", updateValue);

// delete a single value
router.delete("/:id", deleteValue);

module.exports = router;
