const mongoose = require("mongoose");
const shippingClassSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

shippingClassSchema.index({ storeId: 1, slug: 1 }, { unique: true });

const ShippingClass = mongoose.model("ShippingClass", shippingClassSchema);

module.exports = ShippingClass;
