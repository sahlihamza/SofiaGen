const mongoose = require("mongoose");

const overageWaiverSchema = new mongoose.Schema(
  {
    overageRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Overage",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    quotaTypeCode: { type: String, required: true, trim: true, lowercase: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    waivedAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD" },
    reason: { type: String, required: true, trim: true },
    waivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    waivedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["waived", "revoked"], default: "waived" },
  },
  { timestamps: true, collection: "overage_waivers" }
);

overageWaiverSchema.index(
  { overageRuleId: 1, subscriptionId: 1, periodStart: 1 },
  { unique: true }
);
overageWaiverSchema.index({ storeId: 1, status: 1 });

module.exports = mongoose.model("OverageWaiver", overageWaiverSchema);
