const crypto = require("crypto");
const https = require("https");
const http = require("http");
const { URL } = require("url");
const mongoose = require("mongoose");
const StoreWebhook = require("../models/StoreWebhook");
const WebhookDelivery = require("../models/WebhookDelivery");
const WebhookLog = require("../models/WebhookLog");
const { eventBus } = require("../lib/eventBus");

/**
 * StoreWebhookService
 *
 * Configuration -> Delivery -> WebhookLog -> Retry.
 * Secrets are generated server-side (whsec_&), shown exactly once and stored
 * as SHA-256 hashes. Deliveries are signed with
 * `X-Sofia-Signature: sha256=<hmac(secret, raw body)>`.
 */

const WEBHOOK_EVENTS = [
  "order.created",
  "order.updated",
  "order.paid",
  "order.cancelled",
  "product.created",
  "product.updated",
  "customer.created",
  "subscription.updated",
  "store.owner_changed",
];

const DELIVERY_TIMEOUT_MS = 10000;
const MAX_RESPONSE_SNIPPET = 300;
const BLOCKED_HOSTNAMES = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"];

const hashSecret = (secret) => crypto.createHash("sha256").update(secret).digest("hex");

const generateSecret = () => {
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
  return { secret, hint: `${secret.slice(0, 6)}&${secret.slice(-4)}` };
};

const sanitize = (doc) => {
  const json = doc.toJSON ? doc.toJSON() : doc;
  delete json.secretHash;
  return json;
};

function validateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (e) {
    throw invalid("Webhook URL is invalid");
  }
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw invalid("Only http(s) webhook URLs are allowed");
  }
  if (process.env.NODE_ENV === "production" && parsed.protocol === "http:") {
    throw invalid("HTTPS is required in production");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.includes(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw invalid("Private or loopback hosts are not allowed");
  }
  return parsed;
}

function invalid(message) {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
}

function postJson(targetUrl, payloadObject, signature, timeoutMs = DELIVERY_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(targetUrl);
    } catch (e) {
      resolve({ ok: false, httpStatus: 0, durationMs: 0, error: "Invalid URL", snippet: "" });
      return;
    }
    const transport = url.protocol === "http:" ? http : https;
    const body = Buffer.from(JSON.stringify(payloadObject));
    const startedAt = Date.now();

    let request;
    try {
      request = transport.request(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": body.length,
            "X-Sofia-Event": payloadObject.event || "",
            "X-Sofia-Signature": signature,
          },
          timeout: timeoutMs,
        },
        (response) => {
          const chunks = [];
          let totalLength = 0;
          response.on("data", (chunk) => {
            totalLength += chunk.length;
            if (totalLength <= MAX_RESPONSE_SNIPPET) chunks.push(chunk);
          });
          response.on("end", () =>
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              httpStatus: response.statusCode,
              durationMs: Date.now() - startedAt,
              error: null,
              snippet: Buffer.concat(chunks).toString("utf8").slice(0, MAX_RESPONSE_SNIPPET),
            })
          );
        }
      );
      request.on("timeout", () => request.destroy(new Error("Delivery timed out")));
      request.on("error", (err) =>
        resolve({ ok: false, httpStatus: 0, durationMs: Date.now() - startedAt, error: err.message, snippet: "" })
      );
      request.write(body);
      request.end();
    } catch (err) {
      resolve({ ok: false, httpStatus: 0, durationMs: Date.now() - startedAt, error: err.message, snippet: "" });
    }
  });
}

async function create(storeId, data = {}, actorId = null) {
  const url = String(data.url || "").trim();
  validateUrl(url);

  const requestedEvents = Array.isArray(data.events) ? data.events : [];
  const events = WEBHOOK_EVENTS.filter((event) => requestedEvents.includes(event));
  if (events.length === 0) {
    throw invalid("Select at least one valid event type");
  }

  const { secret, hint } = generateSecret();
  const webhook = await StoreWebhook.create({
    storeId,
    url,
    events,
    secretHash: hashSecret(secret),
    secretHint: hint,
    createdBy: actorId,
  });

  return { ...sanitize(webhook), secret };
}

async function list(storeId) {
  const webhooks = await StoreWebhook.find({ storeId }).sort({ createdAt: -1 }).lean();

  const stats = await WebhookDelivery.aggregate([
    { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$webhookId",
        lastDeliveryAt: { $first: "$createdAt" },
        recent: { $push: { status: "$status" } },
        total: { $sum: 1 },
        successes: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
      },
    },
  ]);

  const statsByWebhook = new Map(stats.map((entry) => [String(entry._id), entry]));

  return webhooks.map((webhook) => {
    const entry = statsByWebhook.get(String(webhook._id));
    const recent = entry ? entry.recent.slice(0, 50) : [];
    const recentSuccesses = recent.filter((r) => r.status === "success").length;
    return {
      ...webhook,
      secretHash: undefined,
      lastDeliveryAt: entry?.lastDeliveryAt || null,
      deliveriesTotal: entry?.total || 0,
      successRate: recent.length > 0 ? Math.round((recentSuccesses / recent.length) * 100) : null,
      failures: webhook.failureCount || 0,
    };
  });
}

async function deliver(webhookDoc, event, payloadData = {}) {
  const body = {
    event,
    storeId: String(webhookDoc.storeId),
    data: payloadData,
    timestamp: new Date().toISOString(),
    attempt: 1,
  };
  const rawBody = Buffer.from(JSON.stringify(body));
  // The stored secret hash is used as the HMAC key: raw secrets are never
  // retrievable by design, and the hash is unique per webhook.
  const key = await StoreWebhook.findById(webhookDoc._id).select("secretHash");
  const signature = `sha256=${crypto.createHmac("sha256", key.secretHash).update(rawBody).digest("hex")}`;
  const result = await postJson(webhookDoc.url, body, signature);

  const delivery = await WebhookDelivery.create({
    webhookId: webhookDoc._id,
    storeId: webhookDoc.storeId,
    event,
    payload: body.data,
    httpStatus: result.httpStatus,
    durationMs: result.durationMs,
    attempt: 1,
    status: result.ok ? "success" : "failed",
    responseSnippet: result.snippet,
    error: result.error,
  });

  await StoreWebhook.updateOne(
    { _id: webhookDoc._id },
    {
      $set: {
        lastDeliveryAt: new Date(),
        consecutiveFailures: result.ok ? 0 : (webhookDoc.consecutiveFailures || 0) + 1,
      },
      $inc: result.ok ? { successCount: 1 } : { failureCount: 1 },
    }
  );

  await WebhookLog.create({
    provider: "store_webhook",
    storeId: webhookDoc.storeId,
    event,
    direction: "outbound",
    httpStatus: result.httpStatus || undefined,
    attempts: 1,
    durationMs: result.durationMs || undefined,
    status: result.ok ? "success" : "failed",
    errorMessage: result.error || undefined,
    sourceRef: delivery._id,
    sourceModel: "WebhookDelivery",
    metadata: { webhookId: String(webhookDoc._id), url: webhookDoc.url },
  }).catch(() => {});

  return { ok: result.ok, delivery };
}

async function test(storeId, webhookId, actorId = null) {
  void actorId;
  const webhook = await StoreWebhook.findOne({ _id: webhookId, storeId });
  if (!webhook) {
    const error = new Error("Webhook not found");
    error.name = "NotFound";
    throw error;
  }
  const result = await deliver(webhook, "webhook.test", { message: "Test delivery from Sofia platform" });
  return result;
}

async function retry(storeId, webhookId, deliveryId) {
  const delivery = await WebhookDelivery.findOne({ _id: deliveryId, webhookId, storeId });
  if (!delivery) {
    const error = new Error("Delivery not found");
    error.name = "NotFound";
    throw error;
  }
  const webhook = await StoreWebhook.findOne({ _id: webhookId, storeId });
  if (!webhook) {
    const error = new Error("Webhook not found");
    error.name = "NotFound";
    throw error;
  }

  const attempt = (delivery.attempt || 1) + 1;
  const body = {
    event: delivery.event,
    storeId: String(delivery.storeId),
    data: delivery.payload,
    timestamp: new Date().toISOString(),
    attempt,
  };
  const rawBody = Buffer.from(JSON.stringify(body));
  const key = await StoreWebhook.findById(webhook._id).select("secretHash");
  const signature = `sha256=${crypto.createHmac("sha256", key.secretHash).update(rawBody).digest("hex")}`;
  const result = await postJson(webhook.url, body, signature);

  delivery.attempt = attempt;
  delivery.httpStatus = result.httpStatus;
  delivery.durationMs = result.durationMs;
  delivery.status = result.ok ? "success" : "failed";
  delivery.responseSnippet = result.snippet;
  delivery.error = result.error;
  await delivery.save();

  await StoreWebhook.updateOne(
    { _id: webhook._id },
    {
      $set: { lastDeliveryAt: new Date(), consecutiveFailures: result.ok ? 0 : (webhook.consecutiveFailures || 0) + 1 },
      $inc: result.ok ? { successCount: 1 } : { failureCount: 1 },
    }
  );

  await WebhookLog.create({
    provider: "store_webhook",
    storeId,
    event: delivery.event,
    direction: "outbound",
    httpStatus: result.httpStatus || undefined,
    attempts: attempt,
    durationMs: result.durationMs || undefined,
    status: result.ok ? "success" : "retrying",
    errorMessage: result.error || undefined,
    sourceRef: delivery._id,
    sourceModel: "WebhookDelivery",
    metadata: { webhookId: String(webhook._id), url: webhook.url, retried: true },
  }).catch(() => {});

  return delivery;
}

async function setStatus(storeId, webhookId, status) {
  if (!["active", "disabled"].includes(status)) {
    throw invalid("Invalid status");
  }
  const webhook = await StoreWebhook.findOneAndUpdate(
    { _id: webhookId, storeId },
    { $set: { status } },
    { new: true }
  ).select("-secretHash");
  if (!webhook) {
    const error = new Error("Webhook not found");
    error.name = "NotFound";
    throw error;
  }
  return webhook;
}

async function rotateSecret(storeId, webhookId, actorId = null) {
  void actorId;
  const webhook = await StoreWebhook.findOne({ _id: webhookId, storeId });
  if (!webhook) {
    const error = new Error("Webhook not found");
    error.name = "NotFound";
    throw error;
  }
  const { secret, hint } = generateSecret();
  webhook.secretHash = hashSecret(secret);
  webhook.secretHint = hint;
  await webhook.save();
  return { ...sanitize(webhook), secret };
}

async function remove(storeId, webhookId) {
  const webhook = await StoreWebhook.findOne({ _id: webhookId, storeId });
  if (!webhook) {
    const error = new Error("Webhook not found");
    error.name = "NotFound";
    throw error;
  }
  await StoreWebhook.deleteOne({ _id: webhookId });
  await WebhookDelivery.deleteMany({ webhookId });
  return { success: true };
}

async function listDeliveries(storeId, webhookId, limit = 30) {
  return WebhookDelivery.find({ webhookId, storeId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 30, 100))
    .lean();
}

// Wire real platform events to subscribed webhooks. eventBus emits "*" with
// { scope: "store:<id>", eventName, payload } for every emitForStore call.
eventBus.on("*", ({ scope, eventName, payload }) => {
  if (!scope || !scope.startsWith("store:")) return;
  const storeId = scope.slice("store:".length);
  setImmediate(() => {
    StoreWebhook.find({ storeId, status: "active", events: eventName })
      .then((webhooks) =>
        Promise.all(webhooks.map((webhook) => deliver(webhook, eventName, payload).catch(() => {})))
      )
      .catch(() => {});
  });
});

module.exports = { WEBHOOK_EVENTS, create, list, deliver, test, retry, setStatus, rotateSecret, remove, listDeliveries };
