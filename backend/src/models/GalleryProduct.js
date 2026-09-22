const mongoose = require("mongoose");

// One document = one image belonging to a product.
// Relation: one Product has many GalleryProduct images (one-to-many).
const galleryProductSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    image: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const GalleryProduct = mongoose.model("GalleryProduct", galleryProductSchema);

module.exports = GalleryProduct;
