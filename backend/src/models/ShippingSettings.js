const mongoose = require("mongoose");
const shippingSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },

    // "Calculations"
    enableCalculator: {
      type: Boolean,
      default: false,
    },
    hideCostsUntilAddress: {
      type: Boolean,
      default: false,
    },
    hideRatesWhenFreeShippingAvailable: {
      type: Boolean,
      default: false,
    },

    // "Shipping destination"
    shippingDestination: {
      type: String,
      enum: ["shipping", "billing", "billing_force"],
      default: "billing",
    },

    // "Debug mode"
    debugMode: {
      type: Boolean,
      default: false,
    },

    // "Local pickup" (Point of sale)  general settings; the actual list of
    // pickup locations lives in its own collection (see PickupLocation.js).
    localPickupEnabled: {
      type: Boolean,
      default: false,
    },
    localPickupTitle: {
      type: String,
      default: "Pickup",
      trim: true,
    },
    localPickupHasPrice: {
      type: Boolean,
      default: false,
    },
    localPickupPrice: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: "shipping_settings",
    timestamps: true,
  }
);

const ShippingSettings = mongoose.model("ShippingSettings", shippingSettingsSchema);

module.exports = ShippingSettings;
