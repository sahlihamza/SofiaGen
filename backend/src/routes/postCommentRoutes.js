const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getPostComments,
  getPostCommentById,
  addPostComment,
  updatePostComment,
  moderatePostComment,
  deletePostComment,
} = require("../controller/postCommentController");
const { hasPermission } = require("../middleware/auth");

router.get("/", hasPermission("posts", "manageComments"), getPostComments);
router.get("/:id", hasPermission("posts", "manageComments"), getPostCommentById);
router.post("/", hasPermission("posts", "manageComments"), addPostComment);
router.put("/:id", hasPermission("posts", "manageComments"), updatePostComment);
router.put("/:id/status", hasPermission("posts", "manageComments"), moderatePostComment);
router.delete("/:id", hasPermission("posts", "manageComments"), deletePostComment);

module.exports = router;
