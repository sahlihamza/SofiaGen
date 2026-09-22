const crypto = require("node:crypto");
const EmailQueueJob = require("../../models/EmailQueueJob");
const logger = require("../../config/logger");
const BACKOFF_SCHEDULE_MS = [30 * 1000, 2 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000];
const TRANSIENT_ERROR_CODES = new Set([
  "ECONNECTION",
  "ETIMEDOUT",
  "ECONNRESET",
  "ESOCKET",
  "EAI_AGAIN",
  "ENOTFOUND",
]);

function isTransientError(err) {
  if (err?.code && TRANSIENT_ERROR_CODES.has(err.code)) return true;
  // nodemailer's connection-refused/timeout errors don't always set `code`
  // consistently across transports; the message is the fallback signal.
  return /timed?\s*out|connection|network|greylist/i.test(err?.message || "");
}

function nextAttemptDelay(attempts) {
  const index = Math.min(attempts, BACKOFF_SCHEDULE_MS.length - 1);
  return BACKOFF_SCHEDULE_MS[index];
}
function deriveIdempotencyKey({ idempotencyKey, type, relatedEntity, to, subject }) {
  if (idempotencyKey) return idempotencyKey;
  if (relatedEntity) return `${type}:${relatedEntity}`;

  const hash = crypto
    .createHash("sha1")
    .update(`${type}|${to}|${subject}`)
    .digest("hex")
    .slice(0, 16);
  return `${type}:${hash}`;
}

async function enqueue(params) {
  const { type, to, subject } = params;
  if (!type) throw new Error("EmailQueue.enqueue: 'type' is required");
  if (!to) throw new Error("EmailQueue.enqueue: 'to' is required");
  if (!subject) throw new Error("EmailQueue.enqueue: 'subject' is required");

  const idempotencyKey = deriveIdempotencyKey(params);

  try {
    const job = await EmailQueueJob.create({
      idempotencyKey,
      channel: params.channel || "platform",
      storeId: params.storeId || null,
      type,
      to,
      cc: params.cc,
      bcc: params.bcc,
      from: params.from,
      replyTo: params.replyTo,
      subject,
      html: params.html,
      text: params.text,
      attachments: params.attachments,
      context: params.context || {},
      relatedEntity: params.relatedEntity || null,
      maxAttempts: params.maxAttempts || 5,
    });
    return { queued: true, jobId: job._id, idempotencyKey };
  } catch (err) {
    if (err.code === 11000) {
      // Already queued (or already sent) under this key  exactly the
      // "no double send" guarantee this exists for.
      logger.info(`EmailQueue: duplicate enqueue ignored for ${idempotencyKey}`);
      return { queued: false, duplicate: true, idempotencyKey };
    }
    throw err;
  }
}


async function processDueJobs(batchSize = 20) {
  // EmailService is required lazily to avoid a require cycle: EmailService
  // never needs the queue, only the queue needs EmailService.
  const EmailService = require("./EmailService");

  const now = new Date();
  const due = await EmailQueueJob.find({
    status: { $in: ["pending", "failed"] },
    nextAttemptAt: { $lte: now },
  })
    .sort({ nextAttemptAt: 1 })
    .limit(batchSize);

  let sent = 0;
  let retried = 0;
  let dead = 0;

  for (const job of due) {
    const claimed = await EmailQueueJob.findOneAndUpdate(
      { _id: job._id, status: job.status },
      { $set: { status: "processing" }, $inc: { attempts: 1 } },
      { new: true }
    );
    if (!claimed) continue;

    try {
      await EmailService.send({
        channel: claimed.channel,
        storeId: claimed.storeId,
        type: claimed.type,
        to: claimed.to,
        cc: claimed.cc,
        bcc: claimed.bcc,
        from: claimed.from,
        replyTo: claimed.replyTo,
        subject: claimed.subject,
        html: claimed.html,
        text: claimed.text,
        attachments: claimed.attachments,
        context: claimed.context,
        relatedEntity: claimed.relatedEntity,
      });

      claimed.status = "sent";
      claimed.sentAt = new Date();
      claimed.lastError = null;
      await claimed.save();
      sent += 1;
    } catch (err) {
      const exhausted = claimed.attempts >= claimed.maxAttempts;
      const retryable = isTransientError(err) && !exhausted;

      claimed.lastError = err.message;
      if (retryable) {
        claimed.status = "failed";
        claimed.nextAttemptAt = new Date(Date.now() + nextAttemptDelay(claimed.attempts));
        retried += 1;
      } else {
        claimed.status = "dead";
        dead += 1;
        logger.error(
          `EmailQueue: job ${claimed._id} (${claimed.type}) dead after ${claimed.attempts} attempt(s): ${err.message}`
        );
      }
      await claimed.save();
    }
  }

  return { processed: due.length, sent, retried, dead };
}

/**
 * Basic stats by type/channel/status (MAIL-04 acceptance criterion)  no
 * PII beyond what's already on the job (recipient address), never a
 * password (queued jobs never carry one  see MAIL-02/03).
 */
async function getStats({ since } = {}) {
  const match = since ? { createdAt: { $gte: since } } : {};
  const rows = await EmailQueueJob.aggregate([
    { $match: match },
    { $group: { _id: { type: "$type", channel: "$channel", status: "$status" }, count: { $sum: 1 } } },
    { $sort: { "_id.type": 1, "_id.channel": 1, "_id.status": 1 } },
  ]);

  return rows.map((r) => ({
    type: r._id.type,
    channel: r._id.channel,
    status: r._id.status,
    count: r.count,
  }));
}

module.exports = {
  enqueue,
  processDueJobs,
  getStats,
  isTransientError,
  deriveIdempotencyKey,
  nextAttemptDelay,
  BACKOFF_SCHEDULE_MS,
};
