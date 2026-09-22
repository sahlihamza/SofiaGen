const mongoose = require("mongoose");

/**
 * Overage (P6)
 *
 * Defines per-quota overage billing rules. When a store exceeds the included
 * quota of a plan for a given quota type, the excess is billed at a unit price.
 *
 * Billing strategies:
 *   - pay_as_you_go : billed at the end of the billing period based on actual excess
 *   - prepaid       : the store buys a prepaid block (bucket) of units in advance
 */
const overageSchema = new mongoose.Schema(
  {
    // The quota type being over-billed
    quotaTypeCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    quotaTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuotaType",
      required: false,
    },
    // The plan(s) this overage rule applies to
    planIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Plan",
      default: [],
      index: true,
    },
    // Applies to all plans if empty
    appliesToAllPlans: { type: Boolean, default: false },
    // Threshold above which overage is billed (usually the included quota)
    threshold: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Price per unit of excess
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: { type: String, default: "USD" },
    billingStrategy: {
      type: String,
      enum: ["pay_as_you_go", "prepaid"],
      default: "pay_as_you_go",
    },
    // Maximum overage units allowed in a period (0 = unlimited)
    maxOverage: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Minimum billable excess (avoid micro-invoicing)
    minBillableQty: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Rounding of billed amount
    roundingMode: {
      type: String,
      enum: ["none", "up", "down", "nearest"],
      default: "none",
    },
    name: { type: String, required: false },
    description: { type: String, required: false },
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
    },
    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

// Indexes
overageSchema.index({ quotaTypeCode: 1, status: 1 });
overageSchema.index({ planIds: 1 });

const Overage = mongoose.model("Overage", overageSchema);
module.exports = Overage;
