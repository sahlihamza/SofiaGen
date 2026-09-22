const mongoose = require("mongoose");

// V0-FINAL: a merchant's return/RMA workflow. Previously a refund
// (PaymentRefund) had no concept of a physical return behind it  this is
// the missing link between "customer wants their money back" and "the item
// actually came back and is (or isn't) sellable again".
const returnRequestSchema = new mongoose.Schema(
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
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        variationId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariation", default: null },
        quantity: { type: Number, required: true, min: 1 },
        reason: {
          type: String,
          required: true,
          enum: ["defective", "wrong_item", "changed_mind", "not_as_described", "other"],
        },
      },
    ],
    // Store-level state machine  every transition goes through
    // ReturnRequestService.transition(), never a direct .save() on status,
    // so an illegal jump (requested -> refunded) is structurally impossible
    // rather than merely discouraged.
    status: {
      type: String,
      required: true,
      enum: ["requested", "approved", "awaiting_return", "received", "refunded", "exchanged", "rejected"],
      default: "requested",
      index: true,
    },
    resolution: {
      type: String,
      enum: ["refund", "exchange", "store_credit", null],
      default: null,
    },
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentRefund",
      default: null,
    },
    restocked: {
      type: Boolean,
      default: false,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    // Every transition, in order  the audit trail a state machine needs to
    // be trusted, not just declared. Mirrors the pattern already used for
    // Subscription/Invoice/Shipment status history elsewhere in the project.
    history: [
      {
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        note: { type: String, default: null },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
  },
  {
    collection: "return_requests",
    timestamps: true,
  }
);

returnRequestSchema.index({ storeId: 1, status: 1, createdAt: -1 });
returnRequestSchema.index({ orderId: 1 });

const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);
module.exports = ReturnRequest;
