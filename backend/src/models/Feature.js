const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  featureGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "FeatureGroup", required: false, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "FeatureCategory", required: false },
  description: { type: String, required: false },
  icon: { type: String, required: false },
  status: { type: String, enum: ["active","deprecated"], default: "active" },
}, { timestamps: true });

featureSchema.index({ featureGroupId: 1, code: 1 });

module.exports = mongoose.model("Feature", featureSchema);