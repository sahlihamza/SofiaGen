const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  icon: { type: String, default: "" },
  linkType: {
    type: String,
    enum: ["page", "url", "category", "product"],
    default: "url",
  },
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: "Page", default: null },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  url: { type: String, default: "" },
  openInNewTab: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  displayMode: { type: String, enum: ["dropdown", "mega"], default: "dropdown" },
  megaColumns: { type: Number, default: 1, min: 1, max: 4 },
  children: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { _id: true });

const menuSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    name: { type: String, required: true, trim: true },
    location: {
      type: String,
      enum: ["header", "footer", "mobile"],
      required: true,
    },
    items: { type: [menuItemSchema], default: [] },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId,       ref: "User", default: null },
  },
  { timestamps: true }
);

menuSchema.index({ storeId: 1, location: 1 });

module.exports = mongoose.model("Menu", menuSchema);
