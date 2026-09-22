const mongoose = require("mongoose");

const planChangeRequestSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
    correlationId: { type: String, required: false, trim: true },

    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },

    fromPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: false },
    fromPlanVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "PlanVersion", required: false },
    fromPlanPriceId: { type: mongoose.Schema.Types.ObjectId, ref: "PlanPrice", required: false },

    toPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    toPlanVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "PlanVersion", required: false },
    toPlanPriceId: { type: mongoose.Schema.Types.ObjectId, ref: "PlanPrice", required: false },

    direction: {
      type: String,
      enum: ["upgrade", "downgrade", "neutral"],
      required: false,
    },

    proration: {
      credit: { type: Number, default: 0 },
      newCharge: { type: Number, default: 0 },
      amountDue: { type: Number, default: 0 },
      usedDays: { type: Number, default: 0 },
      remainingDays: { type: Number, default: 0 },
      totalDays: { type: Number, default: 0 },
      currency: { type: String, default: null },
    },

    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: false },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true,
    },
    failedStep: { type: String, required: false, default: null },
    failureReason: { type: String, required: false, default: null },
    failureCode: { type: String, required: false, default: null },

    completedAt: { type: Date, required: false, default: null },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true, collection: "plan_change_requests" }
);

planChangeRequestSchema.index({ idempotencyKey: 1 }, { unique: true });
planChangeRequestSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model("PlanChangeRequest", planChangeRequestSchema);
