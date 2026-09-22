const mongoose = require("mongoose");

/**
 * FeatureGroup  organizes features into business groups.
 *
 * Examples: Catalog, Orders, Customers, CMS, Analytics, API, AI,
 *           POS, Shipping, Marketing, Settings
 *
 * Each group groups several features (referenced via feature.featureGroupId).
 */
const featureGroupSchema = new mongoose.Schema(
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
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    icon: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    color: {
      type: String,
      default: "#3B82F6",
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    featureCount: {
      type: Number,
      default: 0,
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

// Indexes
featureGroupSchema.index({ slug: 1, status: 1 });
featureGroupSchema.index({ name: "text", description: "text" });
featureGroupSchema.index({ displayOrder: 1 });

const FeatureGroup = mongoose.model("FeatureGroup", featureGroupSchema);

module.exports = FeatureGroup;
