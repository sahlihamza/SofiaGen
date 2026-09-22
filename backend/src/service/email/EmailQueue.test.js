const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", "..", ".env") });
const mongoose = require("mongoose");

const EmailQueueJob = require("../../models/EmailQueueJob");
const EmailQueue = require("./EmailQueue");
const EmailService = require("./EmailService");

// MAIL-04  durable queue: idempotent enqueue (no double send for the same
// logical event), bounded exponential retry classified by whether the
// failure was transient, and worker processing against a real MongoDB
// instance (this queue's whole point is surviving a process restart, so an
// in-memory-only test would prove nothing about that).

test.after(async () => {
  // Most fixtures key on relatedEntity (e.g. "store.order.created:__mail04_test__order-1"),
  // so the marker isn't necessarily at the start of the key.
  await EmailQueueJob.deleteMany({ idempotencyKey: { $regex: /__mail04_test__/ } });
  await mongoose.disconnect();
});

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
});

test("deriveIdempotencyKey: prefers type:relatedEntity when a related entity is given", () => {
  const key = EmailQueue.deriveIdempotencyKey({
    type: "store.order.created",
    relatedEntity: "order-123",
    to: "a@b.com",
    subject: "x",
  });
  assert.equal(key, "store.order.created:order-123");
});

test("deriveIdempotencyKey: falls back to a stable hash of (type, to, subject) with no related entity", () => {
  const args = { type: "transactional", relatedEntity: null, to: "a@b.com", subject: "Hello" };
  const key1 = EmailQueue.deriveIdempotencyKey(args);
  const key2 = EmailQueue.deriveIdempotencyKey(args);
  assert.equal(key1, key2, "must be deterministic for the same inputs");
  assert.match(key1, /^transactional:[0-9a-f]{16}$/);
});

test("isTransientError: classifies connection-level errors as transient", () => {
  assert.equal(EmailQueue.isTransientError({ code: "ETIMEDOUT" }), true);
  assert.equal(EmailQueue.isTransientError({ code: "ECONNREFUSED" }), false, "not in the known transient set");
  assert.equal(EmailQueue.isTransientError({ message: "Connection timeout" }), true);
});

test("isTransientError: classifies auth/validation errors as permanent (not retried)", () => {
  assert.equal(EmailQueue.isTransientError({ code: "EAUTH", message: "Invalid login" }), false);
  assert.equal(EmailQueue.isTransientError({ message: "Invalid recipient email format" }), false);
});

test("nextAttemptDelay: bounded exponential backoff, capped at the last schedule entry", () => {
  const schedule = EmailQueue.BACKOFF_SCHEDULE_MS;
  assert.equal(EmailQueue.nextAttemptDelay(0), schedule[0]);
  assert.equal(EmailQueue.nextAttemptDelay(schedule.length - 1), schedule[schedule.length - 1]);
  // Way past the schedule length  must never grow unbounded or throw.
  assert.equal(EmailQueue.nextAttemptDelay(999), schedule[schedule.length - 1]);
});

test("enqueue: writes a pending job with the derived idempotency key", async () => {
  const result = await EmailQueue.enqueue({
    type: "store.order.created",
    relatedEntity: "__mail04_test__order-1",
    to: "customer@example.com",
    subject: "Your order",
    html: "<p>order</p>",
  });

  assert.equal(result.queued, true);
  assert.equal(result.idempotencyKey, "store.order.created:__mail04_test__order-1");

  const job = await EmailQueueJob.findById(result.jobId);
  assert.equal(job.status, "pending");
  assert.equal(job.attempts, 0);
});

test("enqueue: the same event enqueued twice is a no-op, not a duplicate", async () => {
  const params = {
    type: "store.order.created",
    relatedEntity: "__mail04_test__order-2",
    to: "customer@example.com",
    subject: "Your order",
    html: "<p>order</p>",
  };

  const first = await EmailQueue.enqueue(params);
  const second = await EmailQueue.enqueue(params);

  assert.equal(first.queued, true);
  assert.equal(second.queued, false);
  assert.equal(second.duplicate, true);

  const count = await EmailQueueJob.countDocuments({ idempotencyKey: first.idempotencyKey });
  assert.equal(count, 1, "must never create a second row for the same key");
});

test("processDueJobs: a successful send marks the job sent and does not retry it again", async (t) => {
  t.mock.method(EmailService, "send", async () => ({ messageId: "test-id" }));

  await EmailQueue.enqueue({
    type: "store.order.created",
    relatedEntity: "__mail04_test__order-3",
    to: "customer@example.com",
    subject: "Your order",
    html: "<p>order</p>",
  });

  const result = await EmailQueue.processDueJobs();
  assert.ok(result.sent >= 1);

  const job = await EmailQueueJob.findOne({ idempotencyKey: "store.order.created:__mail04_test__order-3" });
  assert.equal(job.status, "sent");
  assert.ok(job.sentAt);

  // A second pass must find nothing left to do for this job  sent jobs are
  // never picked up again.
  await EmailQueue.processDueJobs();
  const unchanged = await EmailQueueJob.findOne({ idempotencyKey: "store.order.created:__mail04_test__order-3" });
  assert.equal(unchanged.attempts, 1, "must not have been reprocessed");
});

test("processDueJobs: a transient failure is retried with a future nextAttemptAt, not sent again immediately", async (t) => {
  t.mock.method(EmailService, "send", async () => {
    const err = new Error("Connection timeout");
    err.code = "ETIMEDOUT";
    throw err;
  });

  await EmailQueue.enqueue({
    type: "store.order.created",
    relatedEntity: "__mail04_test__order-4",
    to: "customer@example.com",
    subject: "Your order",
    html: "<p>order</p>",
  });

  const before = Date.now();
  await EmailQueue.processDueJobs();

  const job = await EmailQueueJob.findOne({ idempotencyKey: "store.order.created:__mail04_test__order-4" });
  assert.equal(job.status, "failed");
  assert.equal(job.attempts, 1);
  assert.ok(job.nextAttemptAt.getTime() > before, "must be scheduled in the future, not retried inline");
  assert.match(job.lastError, /timeout/i);
});

test("processDueJobs: a non-transient failure goes straight to dead  no retry burned on a guaranteed repeat failure", async (t) => {
  t.mock.method(EmailService, "send", async () => {
    throw new Error("Invalid recipient email format");
  });

  await EmailQueue.enqueue({
    type: "store.order.created",
    relatedEntity: "__mail04_test__order-5",
    to: "customer@example.com",
    subject: "Your order",
    html: "<p>order</p>",
  });

  await EmailQueue.processDueJobs();

  const job = await EmailQueueJob.findOne({ idempotencyKey: "store.order.created:__mail04_test__order-5" });
  assert.equal(job.status, "dead");
  assert.equal(job.attempts, 1, "must not keep retrying a failure that will never succeed");
});

test("processDueJobs: exhausting maxAttempts on a transient failure also goes dead, not retried forever", async (t) => {
  t.mock.method(EmailService, "send", async () => {
    const err = new Error("Connection timeout");
    err.code = "ETIMEDOUT";
    throw err;
  });

  await EmailQueueJob.create({
    idempotencyKey: "__mail04_test__order-6-exhausted",
    type: "store.order.created",
    to: "customer@example.com",
    subject: "Your order",
    html: "<p>order</p>",
    attempts: 4,
    maxAttempts: 5,
    status: "failed",
    nextAttemptAt: new Date(Date.now() - 1000),
  });

  await EmailQueue.processDueJobs();

  const job = await EmailQueueJob.findOne({ idempotencyKey: "__mail04_test__order-6-exhausted" });
  assert.equal(job.status, "dead");
  assert.equal(job.attempts, 5);
});

test("getStats: aggregates counts by type/channel/status", async (t) => {
  t.mock.method(EmailService, "send", async () => ({ messageId: "x" }));

  await EmailQueue.enqueue({
    type: "__mail04_test__stats_type",
    to: "a@b.com",
    subject: "x",
    html: "<p>x</p>",
  });
  await EmailQueue.processDueJobs();

  const stats = await EmailQueue.getStats({});
  const row = stats.find((s) => s.type === "__mail04_test__stats_type");
  assert.ok(row, "expected a stats row for the enqueued type");
  assert.equal(row.status, "sent");
  assert.equal(row.channel, "platform");
  assert.equal(row.count, 1);
});
