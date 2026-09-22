const mongoose = require("mongoose");

// SFG-76  the order lines, normalised out of `Order.cart`.
//
// `Order.cart` stays where it is: the invoice PDF, the e-mail templates and the
// best-seller aggregation (`$unwind: "$cart"`) read it, and it keeps the raw
// storefront payload of legacy orders. This collection is the relational view
// of the same lines  one document per line, queryable and joinable, which the
// embedded array never allowed (sales per product, per SKU, per period).
//
// Everything here is a snapshot taken when the order was placed: a product
// renamed, repriced or deleted afterwards must not rewrite what was sold.
const orderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    // Not in the reference table, but the checkout does sell variations and
    // two lines of the same product only differ by this one  without it a
    // variable product's lines cannot be told apart.
    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariation",
      required: false,
      default: null,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    // Catalogue price of one unit at the time of the order, sale price
    // included if a sale was running.
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // This line's share of the order-wide coupon discount  coupons apply to
    // the cart, not to a line, so the amount is allocated in proportion to the
    // line's weight in the cart (orderItemService.buildOrderItems).
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // Same allocation for the VAT, minus the part that belongs to the shipping
    // fee. Always 0 on a line the catalogue flags `taxStatus: "none"`.
    tax: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // What the line contributes to the order: unitPrice  quantity  discount.
    // The VAT is deliberately left out  it is added once at order level, and
    // on a tax-inclusive store it is already inside unitPrice. So
    // (total)  0 + shipping + (tax if prices are tax-exclusive) = order.total.
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    collection: "order_items",
    // A line never changes after the order is placed.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Reading an order's lines back, and the sales-per-product reports.
orderItemSchema.index({ orderId: 1, createdAt: 1 });
orderItemSchema.index({ productId: 1, createdAt: -1 });

const OrderItem = mongoose.model("OrderItem", orderItemSchema);

module.exports = OrderItem;
