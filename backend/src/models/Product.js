const mongoose = require("mongoose");
const storeScopedPlugin = require("./plugins/storeScoped");

const productSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    shortDescription: {
      type: String,
      required: false,
    },
    // A product can belong to several categories (WooCommerce behaviour).
    // Only the ids are stored here  never the category names.
    productCategories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductCategory" }],
      default: [],
    },
    // Legacy single-category field. ProductService keeps it mirrored to
    // productCategories[0] so pre-existing documents and the readers that
    // still expect one category (search filter, exports) keep working.
    productCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: false,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: false,
    },
    productType: {
      type: String,
      enum: ["simple", "variable", "grouped", "external"],
      default: "simple",
    },
    taxStatus: {
      type: String,
      enum: ["taxable", "shipping", "none"],
      default: "taxable",
    },
    taxClass: {
      type: String,
      enum: ["standard", "reduced_rate", "zero_rate"],
      default: "standard",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    visibility: {
      type: String,
      enum: ["public", "private", "hidden"],
      default: "public",
    },
    regularPrice: {
      type: Number,
      required: false,
    },
    salePrice: {
      type: Number,
      required: false,
    },
    // Optional sale window. Both bounds are inclusive and independent: a start
    // with no end runs from that day onwards, an end with no start runs until
    // that day, and neither one set means the sale price is always active.
    // Outside the window the regular price applies.
    saleStart: {
      type: Date,
      required: false,
    },
    saleEnd: {
      type: Date,
      required: false,
      validate: {
        validator: function (v) {
          return v == null || this.saleStart == null || v >= this.saleStart;
        },
        message: "Sale end date must be on or after the sale start date.",
      },
    },
    virtual: {
      type: Boolean,
      default: false,
    },
    downloadable: {
      type: Boolean,
      default: false,
    },
    publishDate: {
      type: Date,
      required: false,
    },
    sku: {
      type: String,
      required: false,
    },
    manageStock: {
      type: Boolean,
      default: false,
    },
    stockQuantity: {
      type: Number,
      required: false,
    },
    stockStatus: {
      type: String,
      enum: ["instock", "outofstock", "onbackorder"],
      default: "instock",
    },
    allowBackorders: {
      type: String,
      enum: ["no", "notify", "yes"],
      default: "no",
    },
    lowStockThreshold: {
      type: Number,
      required: false,
    },
    soldIndividually: {
      type: Boolean,
      default: false,
    },
    upSells: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
      default: [],
    },
    crossSells: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
      default: [],
    },
    weight: {
      type: Number,
      required: false,
      validate: {
        validator: (v) => v == null || v > 0,
        message: "Weight must be a positive number greater than 0.",
      },
    },
    dimensions: {
      length: {
        type: Number,
        required: false,
        validate: {
          validator: (v) => v == null || v > 0,
          message: "Length must be a positive number greater than 0.",
        },
      },
      width: {
        type: Number,
        required: false,
        validate: {
          validator: (v) => v == null || v > 0,
          message: "Width must be a positive number greater than 0.",
        },
      },
      height: {
        type: Number,
        required: false,
        validate: {
          validator: (v) => v == null || v > 0,
          message: "Height must be a positive number greater than 0.",
        },
      },
    },
    shippingClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingClass",
      required: false,
      default: null,
    },
    purchaseNote: {
      type: String,
      required: false,
    },
    enableReviews: {
      type: Boolean,
      default: false,
    },
    // Denormalized from the ProductReview collection so listing/sorting by
    // rating doesn't need an aggregation on every request. Recomputed by
    // productReviewService whenever an approved review is added, edited,
    // removed, or changes status.
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    menuOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One-to-many relation: a product's gallery images live in the
// GalleryProduct collection. Populate "productGallery" to load them.
productSchema.virtual("productGallery", {
  ref: "GalleryProduct",
  localField: "_id",
  foreignField: "product",
  options: { sort: { order: 1, _id: 1 } },
});

// Many-to-many relation: a product's attributes are stored in the
// ProductAttribute junction collection. Populate "productAttributes" to load
// them (populate the nested "attribute" field to get the attribute details).
productSchema.virtual("productAttributes", {
  ref: "ProductAttribute",
  localField: "_id",
  foreignField: "product",
});

// Many-to-many relation: a product's tags are stored in the
// ProductTagRelation junction collection. Populate "productTags" to load them
// (populate the nested "tagId" field to get the tag details).
productSchema.virtual("productTags", {
  ref: "ProductTagRelation",
  localField: "_id",
  foreignField: "productId",
});

// One-to-many relation: a variable product's variations live in the
// ProductVariation collection. Populate "productVariations" to load them.
productSchema.virtual("productVariations", {
  ref: "ProductVariation",
  localField: "_id",
  foreignField: "productId",
});

productSchema.index({ storeId: 1, status: 1 });
productSchema.index({ storeId: 1, productType: 1 });

productSchema.plugin(storeScopedPlugin);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
