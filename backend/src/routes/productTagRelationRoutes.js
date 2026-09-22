const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  linkTag,
  getTagsByProduct,
  getProductsByTag,
  getLinkById,
  setProductTags,
  deleteLink,
} = require("../controller/productTagRelationController");

// link a single tag to a product
router.post("/add", linkTag);

// replace the full set of tag links for a product
router.put("/product/:productId", setProductTags);

// get all tags linked to a product
router.get("/product/:productId", getTagsByProduct);

// get all products that use a tag
router.get("/tag/:tagId", getProductsByTag);

// get a single link by id
router.get("/:id", getLinkById);

// delete a single link
router.delete("/:id", deleteLink);

module.exports = router;
