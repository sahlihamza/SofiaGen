const mongoose = require("mongoose");
const pickupLocationSchema = new mongoose.Schema(
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
    addressLine1: {
      type: String,
      default: "",
      trim: true,
    },
    addressLine2: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    postcode: {
      type: String,
      default: "",
      trim: true,
    },
    // ISO2 country code  same convention as ShippingZone.countries.
    country: {
      type: String,
      default: "",
      trim: true,
    },
    details: {
      type: String,
      default: "",
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const PickupLocation = mongoose.model("PickupLocation", pickupLocationSchema);

module.exports = PickupLocation;
