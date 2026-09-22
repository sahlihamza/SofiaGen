const mongoose = require("mongoose");

// SFG-76  what an order is holding out of the catalogue.
//
// The stock is taken the moment the order is placed (stockReservationService
// decrements the product or the variation), long before the parcel leaves. So
// far that hold left no trace: `Product.stockQuantity` had simply gone down,
// and nothing said which order was holding what. One row per held line  which
// is what makes a hold releasable, countable, and auditable.
//
// Only lines whose stock is actually tracked get a row: a product sold without
// stock management holds nothing, and pretending otherwise would make the
// table lie about the catalogue.
const stockReservationSchema = new mongoose.Schema(
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
    // Not in the reference table, but a variation carries its own counter
    // (`inventory.quantity`). Without it, releasing a variation line would
    // credit the parent product instead  the wrong stock.
    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariation",
      required: false,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    // reserved   the units are out of the catalogue, waiting for the order.
    // released   given back (payment refused, order cancelled before shipping).
    // consumed   gone for good, the order shipped. No stock moves on this
    //             transition: the units left the catalogue when they were
    //             reserved, this only closes the hold.
    status: {
      type: String,
      required: true,
      lowercase: true,
      enum: ["reserved", "released", "consumed"],
      default: "reserved",
      index: true,
    },
  },
  {
    collection: "stock_reservations",
    // A hold changes state (reserved  released/consumed), so `updatedAt` says
    // when it was let go.
    timestamps: true,
  }
);

// The holds of one order, and "what is this product currently holding".
stockReservationSchema.index({ orderId: 1, status: 1 });
stockReservationSchema.index({ productId: 1, status: 1 });

const StockReservation = mongoose.model("StockReservation", stockReservationSchema);

module.exports = StockReservation;
