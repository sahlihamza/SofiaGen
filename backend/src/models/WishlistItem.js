const mongoose = require("mongoose");

const wishlistItemSchema = new mongoose.Schema(
  {
    wishlistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wishlist",
      required: true,
      index: true,
    },

    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariation",
      default: null,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    addedAt: { type: Date, default: Date.now },

    priceSnapshot: { type: Number, default: null, min: 0 },

    currency: { type: String, default: "", trim: true },
  },
  {
    collection: "wishlist_items",
   
    timestamps: false,
  }
);

wishlistItemSchema.index(
  { wishlistId: 1, productId: 1, variationId: 1 },
  { unique: true }
);


wishlistItemSchema.index({ wishlistId: 1, addedAt: -1 });

wishlistItemSchema.index({ storeId: 1, productId: 1 });

const WishlistItem = mongoose.model("WishlistItem", wishlistItemSchema);
module.exports = WishlistItem;
