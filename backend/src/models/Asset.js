const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      default: null,
      index: true,
    },
    folder: {
      type: String,
      default: "/",
      index: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      default: "local",
    },
    category: {
      type: String,
      default: "other",
      index: true,
    },
    key: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: "application/octet-stream",
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Asset", assetSchema);
