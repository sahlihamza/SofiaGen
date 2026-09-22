const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
    },
    logo: {
      type: String,
      required: false,
    },
    website: {
      type: String,
      required: false,
    },
    status: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate the slug from the name when it is missing or the name changed.
brandSchema.pre("validate", function (next) {
  if (this.name && (!this.slug || this.isModified("name"))) {
    this.slug = slugify(this.name);
  }
  next();
});

brandSchema.index({ status: 1 });
brandSchema.index({ deletedAt: 1 });
brandSchema.index({ storeId: 1, slug: 1 }, { unique: true });
brandSchema.index({ storeId: 1, name: 1 }, { unique: true });

brandSchema.plugin(storeScopedPlugin);

const Brand = mongoose.model("Brand", brandSchema);

module.exports = Brand;
