const mongoose = require("mongoose");

const customIconSchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, default: "image/svg+xml" },
    size: { type: Number, default: 0 },
    svgContent: { type: String, required: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    library: { type: String, default: "custom", index: true },
    isFavorite: { type: Boolean, default: false, index: true },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true }
);

customIconSchema.index({ storeId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("CustomIcon", customIconSchema);
