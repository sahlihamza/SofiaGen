const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    // SFG-73 Phase 8: optional so pre-existing notifications (order/product,
    // no coupon involved) are unaffected.
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: false,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    // Set when the notification targets a specific customer (review
    // approved, store replied) rather than the staff inbox. There is no
    // customer-facing UI to read these yet (customer auth is a separate
    // effort)  the record just needs to exist and be ready to surface.
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductReview",
      required: false,
    },
    // SFG-80: set when the notification targets the support inbox (new
    // ticket created). Optional, like the other entity refs above.
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      required: false,
      index: true,
    },
    category: {
      type: String,
      required: false,
      index: true,
    },
    title: {
      type: String,
      required: false,
    },
    locale: {
      type: String,
      enum: ["fr", "en", "ar"],
      default: "fr",
    },
    recipientModel: {
      type: String,
      enum: ["User", "Customer"],
      default: "User",
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientModel",
      required: false,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    entityType: {
      type: String,
      required: false,
      enum: [
        "order",
        "payment",
        "subscription",
        "product",
        "customer",
        "store",
        "user",
        "invoice",
        "ticket",
        "review",
        "security",
        "system",
        "shipment",
        null,
      ],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    channels: {
      type: [String],
      enum: ["in_app", "email", "push", "sms", "whatsapp"],
      default: ["in_app"],
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    actionUrl: {
      type: String,
      required: false,
    },
    expiresAt: {
      type: Date,
      required: false,
      index: true,
    },
    readAt: {
      type: Date,
      required: false,
      default: null,
    },
    deduplicationKey: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["read", "unread", "archived"],
      default: "unread",
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ storeId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ entityType: 1, entityId: 1 });
notificationSchema.index(
  { deduplicationKey: 1 },
  { unique: true, partialFilterExpression: { deduplicationKey: { $type: "string" } } }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
