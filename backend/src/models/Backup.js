const mongoose = require("mongoose");

const backupSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    date: { type: Date, required: false, default: Date.now },
    size: { type: String, required: false, default: "0 MB" },
    type: { type: String, enum: ["Automatic", "Manual"], default: "Manual" },
    status: { type: String, enum: ["Pending", "Complete", "Failed"], default: "Complete" },
    createdBy: { type: String, required: false, default: "System" },
    storageUsed: { type: Number, required: false, default: 0 },
    storageLimit: { type: Number, required: false, default: 0 },
  },
  { timestamps: true }
);

const Backup = mongoose.model("Backup", backupSchema);
module.exports = Backup;
