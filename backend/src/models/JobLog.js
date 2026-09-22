const mongoose = require("mongoose");

// LOG-4: tracks runs of the background jobs (coupon expiry, data retention,
// notification delivery, subscription expiry, log retention, ...). There is
// no queue library in this project (jobs are plain setInterval loops in
// src/jobs/)  this collection is the run history/status for each tick.
const jobLogSchema = new mongoose.Schema(
  {
    jobName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["running", "success", "failed"],
      default: "running",
    },
    attempts: {
      type: Number,
      default: 1,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
      required: false,
    },
    durationMs: {
      type: Number,
      required: false,
    },
    error: {
      type: String,
      required: false,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  {
    collection: "job_logs",
    timestamps: true,
  }
);

jobLogSchema.index({ jobName: 1, createdAt: -1 });
jobLogSchema.index({ status: 1, createdAt: -1 });
jobLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("JobLog", jobLogSchema);
