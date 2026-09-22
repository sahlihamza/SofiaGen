const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    iso2: {
      type: String,
      required: true,
      uppercase: true,
      unique: true,
    },
    iso3: {
      type: String,
      required: true,
      uppercase: true,
      unique: true,
    },
    region: {
      type: String,
      required: false,
    },
    flag: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Country = mongoose.model("Country", countrySchema);

module.exports = Country;
