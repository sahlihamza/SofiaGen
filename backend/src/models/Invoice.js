const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    items: [invoiceItemSchema],
    baseAmount: { type: Number, required: true, min: 0 },
    discounts: [
      {
        couponId: { type: mongoose.Schema.Types.ObjectId },
        code: { type: String },
        discountType: { type: String, enum: ["flat", "fixed", "percentage"] },
        discountAmount: { type: Number, min: 0 },
        appliedAt: { type: Date, default: Date.now },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 1 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: [
        "draft",
        "issued",
        "open",
        "past_due",
        "paid",
        "void",
        "cancelled",
        "refunded",
        "sent",
        "overdue",
        "canceled",
      ],
      default: "draft",
      index: true,
    },
    planSnapshot: {
      name: { type: String, required: false, default: null },
      slug: { type: String, required: false, default: null },
      version: { type: Number, required: false, default: null },
      planVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "PlanVersion", default: null },
      planPriceId: { type: mongoose.Schema.Types.ObjectId, ref: "PlanPrice", default: null },
      price: { type: Number, required: false, default: null },
      currency: { type: String, required: false, default: null },
      cycle: { type: String, required: false, default: null },
      snapshotAt: { type: Date, required: false, default: null },
    },
    paidAt: { type: Date, required: false },
    dueDate: { type: Date, required: false },
    issuedAt: { type: Date, default: Date.now },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: false,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, required: false },
  },
  { timestamps: true }
);

invoiceSchema.pre("save", function (next) {
  if (!this.invoiceNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.invoiceNumber = `INV-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model("Invoice", invoiceSchema);