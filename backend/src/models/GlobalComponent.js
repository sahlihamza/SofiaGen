const mongoose = require("mongoose");

const GlobalComponentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    themeId: { type: mongoose.Schema.Types.ObjectId, ref: "Theme", required: false },
    type: { type: String, enum: ["header", "footer", "hero", "custom"], default: "custom" },
    componentData: { type: mongoose.Schema.Types.Mixed, default: {} },
    html: { type: String, default: "" },
    css: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

GlobalComponentSchema.index({ storeId: 1, themeId: 1 });

module.exports = mongoose.model("GlobalComponent", GlobalComponentSchema);

