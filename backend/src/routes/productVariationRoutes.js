const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  createVariation,
  getVariationsByProduct,
  getVariationById,
  updateVariation,
  setProductVariations,
  deleteVariation,
} = require("../controller/productVariationController");

// create a single variation for a product
router.post("/add", createVariation);

// replace the full set of variations for a product
router.put("/product/:productId", setProductVariations);

// get all variations of a product
router.get("/product/:productId", getVariationsByProduct);

// get a single variation by id
router.get("/:id", getVariationById);

// update a single variation
router.put("/:id", updateVariation);

// delete a single variation
router.delete("/:id", deleteVariation);

module.exports = router;
