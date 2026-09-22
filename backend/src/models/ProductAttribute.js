const mongoose = require("mongoose");

// Junction table for the many-to-many relation between Product and Attribute.
// One document links a single product to a single attribute and carries the
// per-product settings (chosen values, visibility, variation usage).
const productAttributeSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    attribute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attribute",
      required: true,
    },
    values: {
      type: [String],
      default: [],
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    usedForVariation: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// A product can reference a given attribute only once.
productAttributeSchema.index({ product: 1, attribute: 1 }, { unique: true });

const ProductAttribute = mongoose.model(
  "ProductAttribute",
  productAttributeSchema
);

module.exports = ProductAttribute;
