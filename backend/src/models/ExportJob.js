const mongoose = require("mongoose");

// AUDIT-EXPORT-1: large audit/log exports must not be generated inline in
// an HTTP request (risk of timeout/OOM on big result sets). This tracks a
// background export run: request it, poll status, download once ready.
const exportJobSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    source: {
      type: String,
      required: true,
      enum: ["audit", "system", "security", "webhook", "job", "orders", "customers", "products"],
      default: "audit",
    },
    format: {
      type: String,
      required: true,
      enum: ["csv", "json"],
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    fileName: {
      type: String,
      required: false,
    },
    filePath: {
      type: String,
      required: false,
    },
    recordCount: {
      type: Number,
      required: false,
    },
    error: {
      type: String,
      required: false,
    },
    completedAt: {
      type: Date,
      required: false,
    },
    // Downloads expire so the exports directory doesn't grow unbounded 
    // cleaned up by the log retention job.
    expiresAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

exportJobSchema.index({ requestedBy: 1, createdAt: -1 });
exportJobSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("ExportJob", exportJobSchema);
