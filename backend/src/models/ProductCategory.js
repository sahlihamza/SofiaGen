const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const productCategorySchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    // URL-friendly identifier. Optional on input: the service derives it from
    // the name when the client leaves it blank, and keeps it unique.
    slug: {
      type: String,
      required: false,
    },
    // Self-reference building the Parent -> Child hierarchy. null means the
    // category sits at the root of the tree.
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    // adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

// The tree is read parent-by-parent (children of X), so index the parent link.
productCategorySchema.index({ parentId: 1 });
productCategorySchema.index({ slug: 1 });

productCategorySchema.plugin(storeScopedPlugin);

const ProductCategory = mongoose.model(
  "ProductCategory",
  productCategorySchema
);

module.exports = ProductCategory;
