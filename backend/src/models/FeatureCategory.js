const mongoose = require("mongoose");

const featureCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("FeatureCategory", featureCategorySchema);