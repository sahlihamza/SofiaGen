const mongoose = require("mongoose");

// A single attribute selection for a variation, e.g. { Color: Red }.
// attributeId points to the attribute definition and valueId to the chosen value.
const variationAttributeSchema = new mongoose.Schema(
  {
    attributeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attribute",
      required: true,
    },
    valueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttributeValue",
      required: true,
    },
  },
  { _id: false }
);

// A downloadable file attached to a variation.
const downloadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// A concrete, buyable variation of a variable product (products._id).
// Each variation carries its own SKU, pricing, inventory, shipping and tax.
const productVariationSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    barcode: {
      type: String,
      required: false,
      default: null,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    attributes: {
      type: [variationAttributeSchema],
      default: [],
    },
    pricing: {
      regularPrice: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
      },
      salePrice: {
        type: mongoose.Schema.Types.Decimal128,
        required: false,
        default: null,
      },
      costPrice: {
        type: mongoose.Schema.Types.Decimal128,
        required: false,
        default: null,
      },
      saleStart: {
        type: Date,
        required: false,
        default: null,
      },
      saleEnd: {
        type: Date,
        required: false,
        default: null,
      },
    },
    inventory: {
      manageStock: {
        type: Boolean,
        default: false,
      },
      quantity: {
        type: Number,
        default: 0,
      },
      reserved: {
        type: Number,
        default: 0,
      },
      lowStockThreshold: {
        type: Number,
        required: false,
      },
      allowBackorders: {
        type: Boolean,
        default: false,
      },
    },
    shipping: {
      weight: {
        type: mongoose.Schema.Types.Decimal128,
        required: false,
        default: null,
      },
      length: {
        type: mongoose.Schema.Types.Decimal128,
        required: false,
        default: null,
      },
      width: {
        type: mongoose.Schema.Types.Decimal128,
        required: false,
        default: null,
      },
      height: {
        type: mongoose.Schema.Types.Decimal128,
        required: false,
        default: null,
      },
      shippingClassId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShippingClass",
        required: false,
        default: null,
      },
    },
    tax: {
      classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TaxClass",
        required: false,
        default: null,
      },
      status: {
        type: String,
        enum: ["taxable", "none"],
        default: "taxable",
      },
    },
    downloads: {
      type: [downloadSchema],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// A SKU identifies a single variation of a product uniquely.
productVariationSchema.index({ productId: 1, sku: 1 }, { unique: true });

const ProductVariation = mongoose.model(
  "ProductVariation",
  productVariationSchema
);

module.exports = ProductVariation;
