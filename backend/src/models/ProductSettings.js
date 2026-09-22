const mongoose = require("mongoose");

const productSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },

    shopPage: {
      type: String,
      required: true,
    },

    redirectToCartAfterAdd: {
      type: Boolean,
      required: true,
      default: false,
    },
    enableAjaxAddToCart: {
      type: Boolean,
      required: true,
      default: true,
    },

    placeholderImage: {
      type: String,
      required: true,
    },

    enableReviews: {
      type: Boolean,
      required: true,
      default: true,
    },
    showVerifiedOwnerBadge: {
      type: Boolean,
      required: true,
      default: true,
    },
    reviewsRequireVerifiedOwner: {
      type: Boolean,
      required: true,
      default: false,
    },
    
    enableProductRatings: {
      type: Boolean,
      required: true,
      default: false,
    },

    // Per-store review pipeline toggles (moderation, guests, display)  see
    // ReviewSettingsCard.jsx / GET|PUT /api/product-reviews/settings/store.
    reviews: {
      enabled: { type: Boolean, default: true },
      requireApproval: { type: Boolean, default: true },
      verifiedOwnersOnly: { type: Boolean, default: false },
      allowGuestReviews: { type: Boolean, default: true },
      showRating: { type: Boolean, default: true },
      showCount: { type: Boolean, default: true },
      maxImages: { type: Number, default: 5 },
    },
  },
  {
    collection: "product_settings",
    timestamps: true,
  }
);

const ProductSettings = mongoose.model("ProductSettings", productSettingsSchema);

module.exports = ProductSettings;
