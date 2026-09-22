const logger = require("../config/logger");
const JobLogService = require("../service/JobLogService");
const EmailQueue = require("../service/email/EmailQueue");

const DEFAULT_INTERVAL_MS = 15 * 1000;

const runEmailQueueWorker = () => EmailQueue.processDueJobs();

const startEmailQueueWorker = (intervalMs = DEFAULT_INTERVAL_MS) => {
  const runSafely = () => {
    JobLogService.runJob("emailQueueWorker", runEmailQueueWorker).catch((err) =>
      logger.error("emailQueueWorker failed:", err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = { runEmailQueueWorker, startEmailQueueWorker };
