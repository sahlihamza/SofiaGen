const mongoose = require("mongoose");

const subscriptionEventSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: false,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "info", "warning"],
      default: "info",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: false,
      default: null,
    },
    idempotencyKey: {
      type: String,
      required: false,
      trim: true,
    },
    correlationId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "job", "webhook", "api"],
      default: "manual",
    },
  },
  {
    timestamps: true,
  }
);

subscriptionEventSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true, name: "subscription_event_idempotency" }
);
subscriptionEventSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model("SubscriptionEvent", subscriptionEventSchema);
