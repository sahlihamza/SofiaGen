const mongoose = require("mongoose");
const Order = require("./Order");

// SFG-76  audit trail of an order's fulfilment status.
//
// `Order.status` only holds where the order stands right now; nothing recorded
// when it got there, who moved it or why. One row is appended per transition,
// never updated nor deleted  that is what makes it an audit trail.
const orderStatusHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    // Status the order moved *to*. Read off the Order schema so the two can
    // never drift apart.
    status: {
      type: String,
      required: true,
      enum: Order.schema.path("status").enumValues,
    },
    // Why, when a human bothered to say: "client injoignable", "remboursé"...
    comment: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    // The back-office user behind the change. `null` means the application
    // itself moved the order  the checkout creating it, or a payment that
    // failed and cancelled it.
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
  },
  {
    collection: "order_status_history",
    // A row is a fact about a moment: it is written once and never touched.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// The timeline of one order, oldest first.
orderStatusHistorySchema.index({ orderId: 1, createdAt: 1 });

const OrderStatusHistory = mongoose.model(
  "OrderStatusHistory",
  orderStatusHistorySchema
);

module.exports = OrderStatusHistory;
