const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  linkAttribute,
  getAttributesByProduct,
  getProductsByAttribute,
  getLinkById,
  updateLink,
  setProductAttributes,
  deleteLink,
} = require("../controller/productAttributeController");

// link a single attribute to a product
router.post("/add", linkAttribute);

// replace the full set of attribute links for a product
router.put("/product/:productId", setProductAttributes);

// get all attributes linked to a product
router.get("/product/:productId", getAttributesByProduct);

// get all products that use an attribute
router.get("/attribute/:attributeId", getProductsByAttribute);

// get a single link by id
router.get("/:id", getLinkById);

// update a single link (values / visibility / variation)
router.put("/:id", updateLink);

// delete a single link
router.delete("/:id", deleteLink);

module.exports = router;
