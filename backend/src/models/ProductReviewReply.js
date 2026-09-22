const mongoose = require("mongoose");

const productReviewReplySchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductReview",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: [true, "Le message est obligatoire"],
    },
  },
  {
    timestamps: true,
  }
);

// One public store reply per review (WooCommerce behaviour)  replying again
// edits the existing reply instead of stacking a thread.
productReviewReplySchema.index({ reviewId: 1 }, { unique: true });

const ProductReviewReply = mongoose.model("ProductReviewReply", productReviewReplySchema);

module.exports = ProductReviewReply;
