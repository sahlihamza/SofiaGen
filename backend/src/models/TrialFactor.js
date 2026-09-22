const mongoose = require("mongoose");

/**
 * TrialFactor  a factor that can be used to evaluate/compute a store's trial.
 *
 * Categories per cahier des charges:
 *   - Temps: days, hours
 *   - Catalogue: products, categories, brands, variants
 *   - Business: orders, revenue, customers
 *   - API: api_calls
 *   - Stockage: storage, images
 *   - Marketing: emails, coupons
 *   - AI: ai_credits
 */
const trialFactorSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "time",
        "catalog",
        "business",
        "api",
        "storage",
        "marketing",
        "ai",
      ],
      required: true,
    },
    unit: {
      type: String,
      enum: ["number", "gb", "mb", "days", "hours", "currency", "percent"],
      default: "number",
    },
    description: {
      type: String,
      required: false,
    },
    icon: {
      type: String,
      required: false,
    },
    // Which operators are valid for this factor in the rule builder
    operators: {
      type: [String],
      enum: [
        "equals",
        "notEquals",
        "greaterThan",
        "lessThan",
        "greaterThanOrEqual",
        "lessThanOrEqual",
        "between",
        "in",
        "notIn",
      ],
      default: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual"],
    },
    // Whether the factor counts toward TIME (duration) vs usage threshold
    isTimeFactor: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

trialFactorSchema.index({ code: 1 }, { unique: true });
trialFactorSchema.index({ category: 1, status: 1 });
trialFactorSchema.index({ name: "text", description: "text" });

const TrialFactor = mongoose.model("TrialFactor", trialFactorSchema);
module.exports = TrialFactor;
