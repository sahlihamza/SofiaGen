const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const attributeSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      index: true,
    },
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
    type: {
      type: String,
      enum: ["select", "color", "image", "number", "boolean", "text", "date"],
      default: "select",
    },
    displayType: {
      type: String,
      enum: ["select", "swatch", "text", "image"],
      default: "select",
    },
    isVariation: {
      type: Boolean,
      default: false,
    },
    isGlobal: {
      type: Boolean,
      default: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
      default: null,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    enforceStoreId: false,
  }
);

attributeSchema.pre("validate", function (next) {
  if (this.slug) {
    this.slug = slugify(this.slug);
  } else if (this.name) {
    this.slug = slugify(this.name);
  }
  next();
});

attributeSchema.virtual("values", {
  ref: "AttributeValue",
  localField: "_id",
  foreignField: "attributeId",
  options: { sort: { sortOrder: 1, _id: 1 } },
});

attributeSchema.index({ storeId: 1, slug: 1 }, { unique: true });
attributeSchema.plugin(storeScopedPlugin);

const Attribute = mongoose.model("Attribute", attributeSchema);

module.exports = Attribute;
