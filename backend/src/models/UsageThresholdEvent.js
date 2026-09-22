const mongoose = require("mongoose");

const usageThresholdEventSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    quotaTypeCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    threshold: {
      type: Number,
      required: true,
      enum: [80, 90, 100],
    },
    periodKey: {
      type: String,
      required: true,
      trim: true,
    },
    current: { type: Number, default: 0 },
    limit: { type: Number, default: null },
    percentage: { type: Number, default: null },
    notifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "usage_threshold_events" }
);

usageThresholdEventSchema.index(
  { storeId: 1, quotaTypeCode: 1, threshold: 1, periodKey: 1 },
  { unique: true, name: "one_threshold_event_per_period" }
);

module.exports = mongoose.model("UsageThresholdEvent", usageThresholdEventSchema);
