const mongoose = require("mongoose");
const Order = require("./Order");

// SFG-76  the money side of an order, one row per attempt.
//
// An order can be paid at the second try, or refunded a week later: the order
// only carries where its payment stands right now (`Order.paymentStatus`),
// this collection is what actually happened, and when. `Order.paymentId`
// points at the attempt that counts.
const paymentSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentProvider",
      required: false,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    method: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    gateway: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: false,
      default: "",
      trim: true,
      index: true,
    },
    gatewayTransactionId: {
      type: String,
      required: false,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: "usd",
    },
    status: {
      type: String,
      required: true,
      lowercase: true,
      enum: Order.schema.path("paymentStatus").enumValues,
      default: "pending",
      index: true,
    },
    paidAt: {
      type: Date,
      required: false,
      default: null,
    },
    failureReason: {
      type: String,
      required: false,
      trim: true,
    },
    refundedAmount: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    isPartialRefundAllowed: {
      type: Boolean,
      required: false,
      default: false,
    },
    attemptCount: {
      type: Number,
      required: false,
      default: 1,
      min: 0,
    },
    nextRetryAt: {
      type: Date,
      required: false,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: false,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      default: {},
    },
  },
  {
    collection: "payments",
    timestamps: true,
  }
);

// The attempts of one order, newest first  what the back-office shows.
paymentSchema.index({ orderId: 1, createdAt: -1 });
// The payments list, filtered by status or method and paged by date.
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ storeId: 1, status: 1 });
paymentSchema.index({ providerId: 1, status: 1 });
paymentSchema.index({ gatewayTransactionId: 1 });
paymentSchema.index({ customerId: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
