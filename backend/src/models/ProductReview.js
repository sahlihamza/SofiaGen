const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const productReviewSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
      default: null,
    },
    rating: {
      type: Number,
      required: [true, "La note est obligatoire"],
      min: [1, "La note doit être comprise entre 1 et 5"],
      max: [5, "La note doit être comprise entre 1 et 5"],
    },
    reviewerName: {
      type: String,
      required: [true, "Le nom de l'auteur est obligatoire"],
    },
    reviewerEmail: {
      type: String,
      required: [true, "L'email de l'auteur est obligatoire"],
    },
    title: {
      type: String,
      required: false,
    },
    comment: {
      type: String,
      required: [true, "Le commentaire est obligatoire"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "spam"],
      default: "pending",
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    // Denormalized from the ReviewVote collection ("review_votes") so lists
    // and the public page can show "N people found this helpful" without an
    // aggregation per request. Recomputed by productReviewService on each vote.
    helpfulCount: {
      type: Number,
      default: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
    },
    // Denormalized from the ReviewReport collection ("review_reports") so the
    // moderation list can flag reported reviews without an extra query.
    reportCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One-to-one relation: the store's public reply lives in the
// ProductReviewReply collection. Populate "reply" to load it.
productReviewSchema.virtual("reply", {
  ref: "ProductReviewReply",
  localField: "_id",
  foreignField: "reviewId",
  justOne: true,
});

// One-to-many relation: a review's uploaded photos/videos live in the
// ReviewImage collection ("review_images"). Populate "media" to load them.
productReviewSchema.virtual("media", {
  ref: "ReviewImage",
  localField: "_id",
  foreignField: "reviewId",
  options: { sort: { position: 1, _id: 1 } },
});

productReviewSchema.index({ storeId: 1, productId: 1, status: 1 });
productReviewSchema.index({ storeId: 1, createdAt: -1 });
productReviewSchema.index({ productId: 1, rating: 1 });
productReviewSchema.index({ storeId: 1, customerId: 1 });

productReviewSchema.plugin(storeScopedPlugin);

const ProductReview = mongoose.model("ProductReview", productReviewSchema);

module.exports = ProductReview;
