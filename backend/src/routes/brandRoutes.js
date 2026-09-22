const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  addBrand,
  addAllBrands,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
} = require("../controller/brandController");

router.get("/", getAllBrands);
router.get("/:id", getBrandById);
router.post("/", addBrand);
// POST /brands/add/all - import en masse (additif, JSON)
router.post("/add/all", addAllBrands);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

module.exports = router;
