const mongoose = require("mongoose");

const SyncedBlockUsageSchema = new mongoose.Schema(
  {
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: "Page", required: true, index: true },
    savedBlockId: { type: mongoose.Schema.Types.ObjectId, ref: "SavedBlock", required: true, index: true },
    componentId: { type: String, required: true },
  },
  { timestamps: true }
);

SyncedBlockUsageSchema.index({ pageId: 1, componentId: 1 }, { unique: true });

module.exports = mongoose.model("SyncedBlockUsage", SyncedBlockUsageSchema);
