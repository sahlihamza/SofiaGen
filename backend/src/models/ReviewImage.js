const mongoose = require("mongoose");

const reviewImageSchema = new mongoose.Schema(
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
    // Relative path under /static (e.g. "reviewImages/photo-123.jpg")  never
    // an absolute URL, so media stay valid across environments.
    url: {
      type: String,
      required: [true, "Le fichier est obligatoire"],
    },
    type: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

reviewImageSchema.index({ storeId: 1, reviewId: 1, position: 1 });
reviewImageSchema.index({ reviewId: 1 });

const ReviewImage = mongoose.model("ReviewImage", reviewImageSchema, "review_images");

module.exports = ReviewImage;
