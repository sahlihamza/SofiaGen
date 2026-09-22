const mongoose = require("mongoose");

// One cart per shopper and per store. The shopper is either a logged-in
// customer or an anonymous browser session, never both at once: on login the
// guest cart is folded into the customer's one (cartService.mergeCarts).
//
// Deliberately stores no price: every read reprices the lines from the
// catalogue through checkoutCartService, so a cart can never show an amount
// the checkout would then refuse.
const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariation",
      default: null,
    },
    quantity: { type: Number, required: true, min: 1 },
    addedAt: { type: Date, default: Date.now },
  },
  // The line keeps an _id: that is what the update and remove endpoints take,
  // not the product id  a product can sit in the cart under two variations.
  { _id: true }
);

const cartCouponSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    code: { type: String, required: true },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
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
    // Anonymous browser id, minted client-side (store/src/lib/cart-session.js).
    sessionId: { type: String, default: null },
    items: { type: [cartItemSchema], default: [] },
    coupons: { type: [cartCouponSchema], default: [] },
  },
  { timestamps: true }
);

// At most one cart per shopper per store, on whichever key identifies them.
// Partial filters keep the null side out of the unique index  otherwise every
// guest cart would collide on customerId: null.
cartSchema.index(
  { storeId: 1, customerId: 1 },
  { unique: true, partialFilterExpression: { customerId: { $type: "objectId" } } }
);
cartSchema.index(
  { storeId: 1, sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: "string" } } }
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
