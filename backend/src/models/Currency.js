const mongoose = require("mongoose");

const currencySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: false,
    },
    isoCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    decimalDigits: {
      type: Number,
      default: 2,
    },
    locale: {
      type: String,
      default: "en-US",
    },
    status: {
      type: String,
      lowercase: true,
      enum: ["show", "hide"],
      default: "show",
    },
    live_exchange_rates: {
      type: String,
      lowercase: true,
      enum: ["show", "hide"],
      default: "show",
    },
  },
  {
    timestamps: true,
  }
);

const Currency = mongoose.model("Currency", currencySchema);

module.exports = Currency;
