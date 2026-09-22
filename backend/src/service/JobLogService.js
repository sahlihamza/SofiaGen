const JobLog = require("../models/JobLog");
const logger = require("../config/logger");
const { buildUnifiedSearchQuery } = require("../utils/logSearch");

class JobLogService {
  // Wraps a job's execution: creates a "running" entry, then marks it
  // success/failed with duration once the job function settles. Never
  // throws  a logging failure must not stop the job itself.
  async runJob(jobName, fn) {
    const startedAt = new Date();
    let entry = null;
    try {
      entry = await JobLog.create({ jobName, status: "running", startedAt });
    } catch (err) {
      logger.error(`[JobLogService] failed to create run entry for ${jobName}:`, err.message);
    }

    try {
      const result = await fn();
      const finishedAt = new Date();
      if (entry) {
        await JobLog.updateOne(
          { _id: entry._id },
          { status: "success", finishedAt, durationMs: finishedAt - startedAt, result: result || undefined }
        ).catch(() => {});
      }
      return result;
    } catch (err) {
      const finishedAt = new Date();
      if (entry) {
        await JobLog.updateOne(
          { _id: entry._id },
          { status: "failed", finishedAt, durationMs: finishedAt - startedAt, error: err.message }
        ).catch(() => {});
      }
      throw err;
    }
  }

  async getLogs(filters = {}, pagination = {}) {
    const { jobName, status, search, startDate, endDate } = filters;
    const { page = 1, limit = 50 } = pagination;

    const query = {};
    if (jobName) query.jobName = jobName;
    if (status) query.status = status;
    const searchQuery = buildUnifiedSearchQuery(search, { stringFields: ["jobName", "error"] });
    if (searchQuery) Object.assign(query, searchQuery);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      JobLog.find(query).sort("-createdAt").skip(skip).limit(Number(limit)).lean(),
      JobLog.countDocuments(query),
    ]);

    return { data, total, page: Number(page), totalPages: Math.ceil(total / limit) || 1 };
  }

  async deleteOlderThan(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return JobLog.deleteMany({ createdAt: { $lt: cutoff } });
  }
}

module.exports = new JobLogService();
