const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "Général",
    },
    favoritedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    projectData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ["page", "section", "popup"],
      default: "page",
    },
    popupSettings: {
      trigger: { type: String, enum: ["page-load", "exit-intent", "scroll-percentage", "delay", "manual"], default: "page-load" },
      triggerValue: { type: Number, default: 0 },
      frequency: { type: String, enum: ["every-visit", "once-per-session", "once-per-visitor"], default: "once-per-session" },
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    compiledHtml: {
      type: String,
      default: "",
    },
    compiledCss: {
      type: String,
      default: "",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", templateSchema);
