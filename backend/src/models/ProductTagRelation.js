const mongoose = require("mongoose");

// Junction table for the many-to-many relation between Product and ProductTag.
// One document links a single product to a single tag.
const productTagRelationSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    tagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductTag",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// A product can reference a given tag only once.
productTagRelationSchema.index({ productId: 1, tagId: 1 }, { unique: true });

const ProductTagRelation = mongoose.model(
  "ProductTagRelation",
  productTagRelationSchema
);

module.exports = ProductTagRelation;
