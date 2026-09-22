const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const {
  voteOnReview,
  reportOnReview,
  getPublicProductReviews,
} = require("../controller/productReviewController");

// Public storefront endpoints  mounted WITHOUT staff auth (see src/routes.js).
// Visitors vote "helpful / not helpful" on reviews and can report abusive
// ones; identity is a client-side key (customerId when logged in, anonymous
// UUID otherwise).
router.get("/product/:productId", getPublicProductReviews);
router.post("/:id/vote", voteOnReview);
router.post("/:id/report", reportOnReview);

module.exports = router;
