const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    // Basic info
    name: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "hero",
        "image-text",
        "rich-text",
        "testimonials",
        "category-grid",
        "product-grid",
        "custom-html",
      ],
      required: true,
    },

    // Relationships
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    // GrapesJS component data
    componentData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    globalComponentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GlobalComponent",
      default: null,
    },
    overrides: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // HTML/CSS
    html: {
      type: String,
      default: "",
    },
    css: {
      type: String,
      default: "",
    },

    // Section settings
    settings: {
      backgroundColor: { type: String, default: "transparent" },
      padding: { type: String, default: "40px 20px" },
      margin: { type: String, default: "0" },
      customClasses: { type: String, default: "" },
    },

    // Display
    displayOrder: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },

    // Dynamic content
    dynamicContent: {
      categoryCount: Number,
      productCount: Number,
      columnCount: Number,
      sortBy: String,
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
sectionSchema.index({ pageId: 1 });
sectionSchema.index({ storeId: 1 });
sectionSchema.index({ pageId: 1, displayOrder: 1 });

module.exports = mongoose.model("Section", sectionSchema);
