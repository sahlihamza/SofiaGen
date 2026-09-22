const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  addProductTag,
  addAllProductTags,
  getAllProductTags,
  getProductTagById,
  updateProductTag,
  deleteProductTag,
  deleteManyProductTags,
} = require("../controller/productTagController");

// add tag
router.post("/add", addProductTag);

// add all tags
router.post("/add/all", addAllProductTags);

// get all tags
router.get("/", getAllProductTags);

// delete many tags
router.patch("/delete/many", deleteManyProductTags);

// get tag by id
router.get("/:id", getProductTagById);

// update tag
router.put("/:id", updateProductTag);

// delete tag
router.delete("/:id", deleteProductTag);

module.exports = router;
