const mongoose = require("mongoose");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const pointOfSaleSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
    },

    storeName: { type: String, default: "", trim: true },
    physicalAddress: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: {
      type: String,
      default: "",
      trim: true,
      validate: {
        validator: (value) => !value || EMAIL_REGEX.test(value),
        message: "Adresse e-mail invalide",
      },
    },
    refundPolicy: { type: String, default: "" },
  },
  {
    collection: "point_of_sale_settings",
    timestamps: true,
  }
);

const PointOfSaleSettings = mongoose.model(
  "PointOfSaleSettings",
  pointOfSaleSettingsSchema
);

module.exports = PointOfSaleSettings;
