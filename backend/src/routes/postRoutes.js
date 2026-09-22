const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getPosts,
  getPostById,
  addPost,
  updatePost,
  deletePost,
  deleteManyPosts,
  publishPost,
  unpublishPost,
  archivePost,
  duplicatePost,
  bulkUpdateStatus,
  bulkChangeCategory,
  bulkAddTag,
} = require("../controller/postController");
const { hasPermission } = require("../middleware/auth");

router.get("/", hasPermission("posts", "view"), getPosts);
router.get("/:id", hasPermission("posts", "view"), getPostById);
router.post("/", hasPermission("posts", "create"), addPost);
router.put("/:id", hasPermission("posts", "update"), updatePost);
router.patch("/delete/many", hasPermission("posts", "delete"), deleteManyPosts);
router.delete("/:id", hasPermission("posts", "delete"), deletePost);

router.put("/:id/publish", hasPermission("posts", "publish"), publishPost);
router.put("/:id/unpublish", hasPermission("posts", "publish"), unpublishPost);
router.put("/:id/archive", hasPermission("posts", "archive"), archivePost);
router.post("/:id/duplicate", hasPermission("posts", "create"), duplicatePost);

router.put("/bulk/status", hasPermission("posts", "publish"), bulkUpdateStatus);
router.put("/bulk/category", hasPermission("posts", "update"), bulkChangeCategory);
router.put("/bulk/tag", hasPermission("posts", "update"), bulkAddTag);

module.exports = router;
