const mongoose = require("mongoose");

const numberFormatSchema = new mongoose.Schema(
  {
    decimalSeparator: { type: String },
    thousandSeparator: { type: String },
    decimalPlaces: { type: Number },
  },
  { _id: false }
);

const generalSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },
    storeName: {
      type: String,
      required: true,
    },
    storeTagline: {
      type: String,
      required: false,
    },
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: false,
    },
    postcode: {
      type: String,
      required: true,
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
      index: true,
    },
    // Empty array conventionally means "all countries"; a non-empty array
    // restricts to the listed Country ids.
    sellingCountries: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Country",
      default: [],
    },
    shippingCountries: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Country",
      default: [],
    },
    defaultCustomerAddress: {
      type: String,
      enum: ["base", "shipping"],
      required: true,
    },
    enableTaxes: {
      type: Boolean,
      required: true,
      default: false,
    },
    enableCoupons: {
      type: Boolean,
      required: true,
      default: false,
    },
    calcCouponsSequentially: {
      type: Boolean,
      required: false,
      default: false,
    },
    currencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
      index: true,
    },
    timezone: {
      type: String,
      required: true,
    },
    weightUnit: {
      type: String,
      enum: ["kg", "g", "lbs", "oz"],
      required: true,
    },
    dimensionUnit: {
      type: String,
      enum: ["cm", "m", "in", "ft"],
      required: true,
    },
    dateFormat: {
      type: String,
      required: true,
    },
    numberFormat: {
      type: numberFormatSchema,
      required: false,
    },
  },
  {
    collection: "general_settings",
    timestamps: true,
  }
);

const GeneralSettings = mongoose.model("GeneralSettings", generalSettingsSchema);

module.exports = GeneralSettings;
