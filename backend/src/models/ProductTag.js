const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const productTagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

productTagSchema.pre("validate", function (next) {
  if (this.name && (!this.slug || this.isModified("name"))) {
    this.slug = slugify(this.name);
  }
  next();
});

productTagSchema.index({ storeId: 1, slug: 1 }, { unique: true });
productTagSchema.index({ storeId: 1, name: 1 }, { unique: true });
productTagSchema.plugin(storeScopedPlugin);

const ProductTag = mongoose.model("ProductTag", productTagSchema);

module.exports = ProductTag;

