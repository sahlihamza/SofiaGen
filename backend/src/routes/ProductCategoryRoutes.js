const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  addCategory,
  addAllCategories,
  getShowingCategories,
  getMostUsedCategories,
  getAllCategories,
  getCategoryById,
  getProductsByCategory,
  updateCategory,
  updateStatus,
  deleteCategory,
  deleteManyCategories,
} = require("../controller/ProductCategoryController");

//add a category
router.post("/add", addCategory);

//add multiple categories
router.post("/all", addAllCategories);

//get only active categories
router.get("/show", getShowingCategories);

//get categories ranked by product count (declared before "/:id" so the
//literal path is not swallowed by the id param)
router.get("/most-used", getMostUsedCategories);

//get all categories
router.get("/", getAllCategories);

//get products of a category (one-to-many)
router.get("/:id/products", getProductsByCategory);

//get a category
router.get("/:id", getCategoryById);

//update a category
router.put("/:id", updateCategory);

//update a category status
router.put("/status/:id", updateStatus);

//delete a category
router.delete("/:id", deleteCategory);

//delete many categories
router.patch("/delete/many", deleteManyCategories);

module.exports = router;
