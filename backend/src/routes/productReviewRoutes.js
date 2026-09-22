const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  getProductReviews,
  getProductReviewById,
  addProductReview,
  updateProductReview,
  deleteProductReview,
  deleteManyProductReviews,
  approveProductReview,
  rejectProductReview,
  markAsSpamProductReview,
  replyToReview,
  deleteReviewReply,
  setReviewMedia,
  deleteReviewMediaItem,
  getReviewReports,
  clearReviewReports,
  getReviewSettings,
  updateReviewSettings,
  bulkUpdateStatus,
} = require("../controller/productReviewController");
const { hasPermission } = require("../middleware/auth");

router.get("/", hasPermission("reviews", "view"), getProductReviews);
// NOTE: must come before "/:id" so "settings" isn't swallowed as a review id.
router.get("/settings/store", hasPermission("reviews", "view"), getReviewSettings);
router.put("/settings/store", hasPermission("reviews", "update"), updateReviewSettings);
router.get("/:id", hasPermission("reviews", "view"), getProductReviewById);
router.post("/", hasPermission("reviews", "create"), addProductReview);
router.put("/bulk/status", hasPermission("reviews", "approve"), bulkUpdateStatus);
router.put("/:id", hasPermission("reviews", "update"), updateProductReview);
router.put("/:id/approve", hasPermission("reviews", "approve"), approveProductReview);
router.put("/:id/reject", hasPermission("reviews", "approve"), rejectProductReview);
router.put("/:id/spam", hasPermission("reviews", "approve"), markAsSpamProductReview);
router.post("/:id/reply", hasPermission("reviews", "reply"), replyToReview);
router.delete("/:id/reply", hasPermission("reviews", "reply"), deleteReviewReply);
router.put("/:id/media", hasPermission("reviews", "update"), setReviewMedia);
router.delete("/media/:mediaId", hasPermission("reviews", "update"), deleteReviewMediaItem);
router.get("/:id/reports", hasPermission("reviews", "approve"), getReviewReports);
router.delete("/:id/reports", hasPermission("reviews", "approve"), clearReviewReports);
router.patch("/delete/many", hasPermission("reviews", "delete"), deleteManyProductReviews);
router.delete("/:id", hasPermission("reviews", "delete"), deleteProductReview);

module.exports = router;
