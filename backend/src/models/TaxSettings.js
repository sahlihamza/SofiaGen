const mongoose = require("mongoose");

// Mirrors WooCommerce's Réglages > Taxes screen: one set of global tax
// options, a list of additional tax classes beyond "Standard", and one rate
// table per tax class (keyed by "standard" or a class name).
const CALCULATE_TAX_BASED_ON = ["shipping", "billing", "shopBase"];
const PRICE_DISPLAY = ["inclusive", "exclusive"];
const TAX_TOTALS_DISPLAY = ["single", "itemized"];
const STANDARD_TAX_CLASS = "standard";

const taxRateSchema = new mongoose.Schema(
  {
    // "standard" or one of TaxSettings.additionalTaxClasses (by name).
    taxClass: { type: String, default: STANDARD_TAX_CLASS, trim: true },
    // ISO2 country code or "*" for any country; empty means "any".
    country: { type: String, default: "", trim: true, uppercase: true },
    // ISO2 state/province code or "*"; empty means "any".
    state: { type: String, default: "", trim: true, uppercase: true },
    // Supports a trailing wildcard, e.g. "90210*".
    postcode: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    rate: { type: Number, required: true, min: 0 },
    name: { type: String, required: true, trim: true },
    // Rates with the same priority are alternatives (first match wins);
    // different priorities all apply and stack (see scenario 3/4).
    priority: { type: Number, default: 1, min: 1 },
    // Calculated on top of the running total instead of the order subtotal.
    compound: { type: Boolean, default: false },
    // Whether this rate also applies to shipping costs.
    shipping: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const taxOptionsSchema = new mongoose.Schema(
  {
    pricesIncludeTax: { type: Boolean, default: false },
    calculateTaxBasedOn: {
      type: String,
      enum: CALCULATE_TAX_BASED_ON,
      default: "shipping",
    },
    // "inherit" (from cart items) or one of the tax class names.
    shippingTaxClass: { type: String, default: "inherit", trim: true },
    roundTaxAtSubtotal: { type: Boolean, default: false },
    displayPricesInShop: {
      type: String,
      enum: PRICE_DISPLAY,
      default: "exclusive",
    },
    displayPricesDuringCartAndCheckout: {
      type: String,
      enum: PRICE_DISPLAY,
      default: "exclusive",
    },
    priceDisplaySuffix: { type: String, default: "", trim: true },
    displayTaxTotals: {
      type: String,
      enum: TAX_TOTALS_DISPLAY,
      default: "itemized",
    },
  },
  { _id: false }
);

const taxSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },

    options: { type: taxOptionsSchema, default: () => ({}) },
    additionalTaxClasses: { type: [String], default: [] },
    rates: { type: [taxRateSchema], default: [] },
  },
  {
    collection: "tax_settings",
    timestamps: true,
  }
);

const TaxSettings = mongoose.model("TaxSettings", taxSettingsSchema);

module.exports = TaxSettings;
module.exports.CALCULATE_TAX_BASED_ON = CALCULATE_TAX_BASED_ON;
module.exports.PRICE_DISPLAY = PRICE_DISPLAY;
module.exports.TAX_TOTALS_DISPLAY = TAX_TOTALS_DISPLAY;
module.exports.STANDARD_TAX_CLASS = STANDARD_TAX_CLASS;
