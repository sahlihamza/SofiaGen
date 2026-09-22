const crypto = require("crypto");
const WebhookEvent = require("../../models/WebhookEvent");
const logger = require("../../config/logger");

const TERMINAL_STATUSES = ["processed", "ignored"];

const sha256 = (value) =>
  crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");

const extractEventId = (payload = {}) => {
  const candidates = [
    payload.id,
    payload.eventId,
    payload.event_id,
    payload.transactionId,
    payload.transaction_id,
    payload.data?.id,
    payload.data?.object?.id,
  ];
  const found = candidates.find((c) => c !== undefined && c !== null && String(c).trim() !== "");
  return found ? String(found).trim() : null;
};

const buildIdentity = (payload) => {
  const payloadHash = sha256(payload);
  const providerEventId = extractEventId(payload);
  return {
    payloadHash,
    eventId: providerEventId || payloadHash,
    eventIdSource: providerEventId ? "provider" : "payload_hash",
  };
};

const processWebhook = async (provider, rawPayload, { handler, eventType = null } = {}) => {
  if (!provider) throw new Error("provider est obligatoire");
  if (typeof handler !== "function") throw new Error("handler est obligatoire");

  const providerKey = String(provider).trim().toLowerCase();
  const { payloadHash, eventId, eventIdSource } = buildIdentity(rawPayload);
  const resolvedType = eventType || rawPayload?.type || rawPayload?.event || "unknown";

  let event;
  try {
    event = await WebhookEvent.create({
      provider: providerKey,
      eventId,
      eventType: resolvedType,
      payloadHash,
      eventIdSource,
      status: "processing",
      attempts: 1,
    });
  } catch (err) {
    if (err.code === 11000) {
      const existing = await WebhookEvent.findOne({ provider: providerKey, eventId }).lean();
      logger.info(`WebhookProcessing: evenement deja recu ${providerKey}/${eventId} (${existing?.status})`);
      return {
        status: "ignored",
        reason: "duplicate",
        existingStatus: existing ? existing.status : "unknown",
        eventId,
        webhookEventId: existing ? existing._id : null,
      };
    }
    throw err;
  }

  try {
    const result = await handler(rawPayload, { eventId, eventType: resolvedType, webhookEventId: event._id });

    event.status = "processed";
    event.processedAt = new Date();
    event.result = result === undefined ? null : result;
    await event.save();

    return { status: "processed", eventId, webhookEventId: event._id, result };
  } catch (err) {
    event.status = "failed";
    event.error = err.message;
    event.processedAt = new Date();
    await event.save().catch(() => {});

    logger.error(`WebhookProcessing: traitement echoue ${providerKey}/${eventId}: ${err.message}`);
    return { status: "failed", eventId, webhookEventId: event._id, error: err.message };
  }
};

const retryFailed = async (provider, eventId, { handler } = {}) => {
  const providerKey = String(provider).trim().toLowerCase();
  const event = await WebhookEvent.findOne({ provider: providerKey, eventId });

  if (!event) {
    const err = new Error("Evenement webhook introuvable");
    err.status = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  if (TERMINAL_STATUSES.includes(event.status)) {
    return { status: "ignored", reason: "already_terminal", existingStatus: event.status, eventId };
  }

  event.attempts += 1;
  event.status = "processing";
  await event.save();

  try {
    const result = await handler(event.payloadHash, { eventId, webhookEventId: event._id });
    event.status = "processed";
    event.processedAt = new Date();
    event.result = result === undefined ? null : result;
    await event.save();
    return { status: "processed", eventId, attempts: event.attempts };
  } catch (err) {
    event.status = "failed";
    event.error = err.message;
    await event.save().catch(() => {});
    return { status: "failed", eventId, attempts: event.attempts, error: err.message };
  }
};

module.exports = {
  processWebhook,
  retryFailed,
  buildIdentity,
  extractEventId,
  sha256,
};
