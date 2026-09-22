const mongoose = require("mongoose");

const quotaTypeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  unit: { type: String, enum: ["number","gb","mb","days"], default: "number" },
  minValue: { type: Number, default: 0, min: 0 },
  maxValue: { type: Number, required: false, min: 0 },
  defaultValue: { type: Number, required: false },
  allowUnlimited: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("QuotaType", quotaTypeSchema);