const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getPostCategories,
  getPostCategoryById,
  addPostCategory,
  updatePostCategory,
  deletePostCategory,
  deleteManyPostCategories,
} = require("../controller/postCategoryController");
const { hasPermission } = require("../middleware/auth");

router.get("/", hasPermission("posts", "manageCategories"), getPostCategories);
router.get("/:id", hasPermission("posts", "manageCategories"), getPostCategoryById);
router.post("/", hasPermission("posts", "manageCategories"), addPostCategory);
router.put("/:id", hasPermission("posts", "manageCategories"), updatePostCategory);
router.patch("/delete/many", hasPermission("posts", "manageCategories"), deleteManyPostCategories);
router.delete("/:id", hasPermission("posts", "manageCategories"), deletePostCategory);

module.exports = router;
