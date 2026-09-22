const mongoose = require("mongoose");

// One wishlist per shopper and per store. The shopper is either a logged-in
// customer or an anonymous browser session, never both at once: on login the
// guest wishlist is folded into the customer's one
// (wishlistService.mergeWishlists).
//
// The lines live in their own collection (models/WishlistItem) rather than in
// an embedded array like the cart's: a wishlist is kept for months and is read
// across shoppers ("how many people saved this product"), which an embedded
// array cannot answer without unwinding every document.
const wishlistSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    // Anonymous browser id, the same one the cart uses
    // (store/src/lib/cart-session.js).
    sessionId: { type: String, default: null },
  },
  { timestamps: true }
);

// At most one wishlist per shopper per store, on whichever key identifies them.
// Partial filters keep the null side out of the unique index  otherwise every
// guest wishlist would collide on customerId: null.
wishlistSchema.index(
  { storeId: 1, customerId: 1 },
  { unique: true, partialFilterExpression: { customerId: { $type: "objectId" } } }
);
wishlistSchema.index(
  { storeId: 1, sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: "string" } } }
);

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;
