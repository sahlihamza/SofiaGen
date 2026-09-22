const mongoose = require("mongoose");

const AssetFolderSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      default: null,
      index: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parentPath: {
      type: String,
      default: "/",
      trim: true,
    },
  },
  { timestamps: true }
);

AssetFolderSchema.index({ storeId: 1, path: 1 }, { unique: true });

module.exports = mongoose.model("AssetFolder", AssetFolderSchema);
