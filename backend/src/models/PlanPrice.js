const mongoose = require("mongoose");

/**
 * PlanPrice  Multi-currency & multi-cycle pricing for a Plan.
 *
 * Supports:
 *  - Multiple currencies (USD, EUR, GBP, TND, ...)
 *  - Multiple billing cycles (monthly, quarterly, semi_annual, yearly, custom)
 *  - Tiered pricing (optional) e.g. 0-100 orders => 49, 100+ => 39
 *  - Effective date windows (price lifecycle)
 */
const priceTierSchema = new mongoose.Schema(
  {
    fromQty: { type: Number, required: true, min: 0 },
    toQty: { type: Number, required: false }, // null = open-ended
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const planPriceSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    priceVersion: {
      type: Number,
      default: 1,
      min: 1,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: "USD",
    },
    cycle: {
      type: String,
      required: true,
      enum: ["monthly", "quarterly", "semi_annual", "yearly", "custom"],
      default: "monthly",
      lowercase: true,
    },
    cycleLabel: {
      type: String,
      required: false, // e.g. "Every 3 months" for custom cycles
    },
    cycleDurationDays: {
      type: Number,
      required: false, // for "custom" cycles
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    setupFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxIncluded: {
      type: Boolean,
      default: false,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    // Tiered pricing (optional)
    tiered: {
      enabled: { type: Boolean, default: false },
      tiers: [priceTierSchema],
    },
    // Price lifecycle
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
      required: false, // null = currently active price
    },
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    // For migrated prices
    legacyCycle: {
      type: String,
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// === MongoDB Indexes ===
// Primary lookup: find active price for a plan+currency+cycle
planPriceSchema.index(
  { planId: 1, currency: 1, cycle: 1, status: 1, effectiveFrom: -1 },
  { name: "plan_currency_cycle_lookup" }
);
// Only one active price per plan/currency/cycle
planPriceSchema.index(
  { planId: 1, currency: 1, cycle: 1, effectiveFrom: 1, effectiveTo: 1 },
  { name: "plan_currency_cycle_effective" }
);
// Search/filter
planPriceSchema.index({ status: 1, createdAt: -1 });
planPriceSchema.index({ "tiered.tiers.fromQty": 1 });

const PlanPrice = mongoose.model("PlanPrice", planPriceSchema);

module.exports = PlanPrice;

