const mongoose = require("mongoose");

/**
 * Asynchronous store backup job: POST queues it, a background worker moves it
 * through queued -> running -> completed/failed with progress reporting.
 */
const backupJobSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["manual", "scheduled"], default: "manual" },
    status: { type: String, enum: ["queued", "running", "completed", "failed"], default: "queued" },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    size: { type: Number, default: null },
    checksum: { type: String, required: false, select: false },
    filePath: { type: String, required: false, select: false },
    storage: { type: String, default: "local" },
    retentionDays: { type: Number, default: 30 },
    encrypted: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    error: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BackupJob", backupJobSchema);
