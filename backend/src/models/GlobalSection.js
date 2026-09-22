const mongoose = require("mongoose");

const globalSectionSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    themeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theme",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["header", "footer", "announcement_bar", "cookie_banner"],
      required: true,
    },
    cookieSettings: {
      position: { type: String, enum: ["bottom", "top", "bottom-left", "bottom-right"], default: "bottom" },
      showDeclineButton: { type: Boolean, default: true },
      linkToPolicyPageId: { type: mongoose.Schema.Types.ObjectId, ref: "Page", default: null },
    },
    projectData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    compiledHtml: {
      type: String,
      default: "",
    },
    compiledCss: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

globalSectionSchema.index({ storeId: 1, themeId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("GlobalSection", globalSectionSchema);
