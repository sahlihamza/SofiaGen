const mongoose = require("mongoose");

const planPriceHistorySchema = new mongoose.Schema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true, index: true },
  version: { type: Number, required: false },
  oldMonthlyPrice: { type: Number, required: false },
  newMonthlyPrice: { type: Number, required: false },
  oldYearlyPrice: { type: Number, required: false },
  newYearlyPrice: { type: Number, required: false },
  strategy: { type: String, required: false, enum: ["new_subscribers_only","all_prorated","all_immediate"] },
  changeDescription: { type: String, required: false },
  versionNote: { type: String, required: false },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  changedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("PlanPriceHistory", planPriceHistorySchema);