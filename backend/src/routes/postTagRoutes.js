const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getPostTags,
  getPostTagById,
  addPostTag,
  updatePostTag,
  deletePostTag,
  deleteManyPostTags,
} = require("../controller/postTagController");
const { hasPermission } = require("../middleware/auth");

router.get("/", hasPermission("posts", "manageTags"), getPostTags);
router.get("/:id", hasPermission("posts", "manageTags"), getPostTagById);
router.post("/", hasPermission("posts", "manageTags"), addPostTag);
router.put("/:id", hasPermission("posts", "manageTags"), updatePostTag);
router.patch("/delete/many", hasPermission("posts", "manageTags"), deleteManyPostTags);
router.delete("/:id", hasPermission("posts", "manageTags"), deletePostTag);

module.exports = router;
