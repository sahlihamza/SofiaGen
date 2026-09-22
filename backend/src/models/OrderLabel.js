const mongoose = require("mongoose");

// SFG-155  the print state of an order's packing label.
//
// Deliberately a collection of its own, and deliberately NOT a field on
// Order: printing a label and handing the parcel to the carrier are two
// distinct business acts. Generating a label must never move Order.status to
// "Shipped"  that transition stays where it already lives (updateOrder /
// orderStatusHistoryService). This document only answers "has this order's
// label been produced, and has it been printed yet".
//
// One row per order (the unique index below): reprinting the same order keeps
// the same row and bumps printCount rather than piling up history.
const orderLabelSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    // The shipment the label was built from, when there is one. Null means the
    // label was produced in draft mode (no Shipment yet, hence no carrier
    // tracking number and no barcode).
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      default: null,
    },
    carrierProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarrierProvider",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "label_generated", "printed"],
      default: "pending",
      index: true,
    },
    format: {
      type: String,
      enum: ["a4", "label_10x15"],
      default: "a4",
    },
    // Snapshot of what was actually printed on the label  the carrier can
    // re-issue a tracking number later, and the paper in the box keeps the old
    // one.
    trackingNumber: {
      type: String,
      default: null,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    generatedAt: { type: Date, default: null },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    printedAt: { type: Date, default: null },
    printedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    printCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    collection: "order_labels",
    timestamps: true,
  }
);

orderLabelSchema.index({ storeId: 1, orderId: 1 }, { unique: true });
orderLabelSchema.index({ storeId: 1, status: 1 });

const OrderLabel = mongoose.model("OrderLabel", orderLabelSchema);

module.exports = OrderLabel;
