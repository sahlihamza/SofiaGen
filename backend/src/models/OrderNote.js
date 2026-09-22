const mongoose = require("mongoose");

// Back-office notes attached to one order.
//
// `Order.notes` is a different thing and stays where it is: one free-text field
// the *customer* filled in at checkout. This collection is what the staff
// writes afterwards  one document per note, appended and never rewritten, so
// the order keeps a readable trail of what was decided and when.
const orderNoteSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
    // "private" stays inside the back-office. "customer" is meant to be read by
    // the client  it is the one an order-update e-mail would quote, so the two
    // must never be shown the same way.
    type: {
      type: String,
      enum: ["private", "customer"],
      default: "private",
    },
    // The staff member who wrote it. Null for notes added by the application.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
  },
  {
    collection: "order_notes",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// The timeline of one order, newest first.
orderNoteSchema.index({ orderId: 1, createdAt: -1 });

const OrderNote = mongoose.model("OrderNote", orderNoteSchema);

module.exports = OrderNote;
