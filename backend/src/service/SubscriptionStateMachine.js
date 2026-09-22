const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const Store = require("../models/Store");
const SubscriptionEvent = require("../models/SubscriptionEvent");
const AuditService = require("./AuditService");
const logger = require("../config/logger");
const { emitEvent } = require("../lib/eventBus");
const { STATUS, CANONICAL_STATUSES, normalizeStatus } = require("../utils/subscriptionStatus");

const ALLOWED_TRANSITIONS = {
  [STATUS.PENDING]: [STATUS.TRIALING, STATUS.ACTIVE, STATUS.CANCELLED, STATUS.EXPIRED],
  [STATUS.TRIALING]: [
    STATUS.ACTIVE,
    STATUS.PAST_DUE,
    STATUS.EXPIRED,
    STATUS.CANCELLED,
    STATUS.SUSPENDED,
  ],
  [STATUS.ACTIVE]: [STATUS.PAST_DUE, STATUS.CANCELLED, STATUS.SUSPENDED],
  [STATUS.PAST_DUE]: [STATUS.ACTIVE, STATUS.GRACE_PERIOD, STATUS.SUSPENDED, STATUS.CANCELLED],
  [STATUS.GRACE_PERIOD]: [STATUS.ACTIVE, STATUS.SUSPENDED, STATUS.CANCELLED],
  [STATUS.SUSPENDED]: [STATUS.ACTIVE, STATUS.CANCELLED, STATUS.EXPIRED],
  [STATUS.CANCELLED]: [],
  [STATUS.EXPIRED]: [STATUS.ACTIVE],
};

const TERMINAL_STATUSES = CANONICAL_STATUSES.filter(
  (s) => (ALLOWED_TRANSITIONS[s] || []).length === 0
);

const AUDIT_SEVERITY = {
  [STATUS.CANCELLED]: "critical",
  [STATUS.SUSPENDED]: "critical",
  [STATUS.EXPIRED]: "high",
  [STATUS.GRACE_PERIOD]: "medium",
  [STATUS.PAST_DUE]: "medium",
  [STATUS.ACTIVE]: "low",
  [STATUS.TRIALING]: "low",
  [STATUS.PENDING]: "low",
};

const invalidTransition = (from, to) => {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  const err = new Error(
    `Invalid transition ${from} -> ${to}. Autorisés depuis "${from}" : ${
      allowed.length ? allowed.join(", ") : "aucune (statut terminal)"
    }`
  );
  err.status = 409;
  err.code = "INVALID_TRANSITION";
  err.from = from;
  err.to = to;
  return err;
};

const badRequest = (message, code = "BAD_REQUEST") => {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
};

const notFound = (message) => {
  const err = new Error(message);
  err.status = 404;
  err.code = "NOT_FOUND";
  return err;
};

const canTransition = (from, to) => {
  const f = normalizeStatus(from);
  const t = normalizeStatus(to);
  if (!f || !t) return false;
  if (!CANONICAL_STATUSES.includes(t)) return false;
  return (ALLOWED_TRANSITIONS[f] || []).includes(t);
};

const assertCanTransition = (from, to) => {
  const f = normalizeStatus(from);
  const t = normalizeStatus(to);
  if (!CANONICAL_STATUSES.includes(t)) {
    throw badRequest(`Statut cible inconnu : "${to}"`, "UNKNOWN_STATUS");
  }
  if (!canTransition(f, t)) throw invalidTransition(f, t);
  return t;
};

const recordEvent = async ({ subscription, from, to, reason, actorId, source }) => {
  try {
    await SubscriptionEvent.create({
      subscriptionId: subscription._id,
      storeId: subscription.storeId,
      planId: subscription.planId,
      type: "status_changed",
      message: `${from} -> ${to}${reason ? `: ${reason}` : ""}`,
      payload: { from, to, reason: reason || null, source },
      status: "info",
    });
  } catch (err) {
    logger.error(`SubscriptionStateMachine: event non enregistre: ${err.message}`);
  }
};

const syncStore = async (subscription) => {
  try {
    await Store.updateOne(
      { _id: subscription.storeId },
      { $set: { subscriptionStatus: subscription.status } }
    );
  } catch (err) {
    logger.error(`SubscriptionStateMachine: sync store echouee: ${err.message}`);
  }
};

const transition = async (
  subscriptionId,
  toStatus,
  { reason, actorId = null, source = "manual", extra = {} } = {}
) => {
  if (!subscriptionId || !mongoose.Types.ObjectId.isValid(subscriptionId)) {
    throw badRequest("Identifiant d'abonnement invalide");
  }

  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw notFound("Abonnement introuvable");

  const from = normalizeStatus(subscription.status);
  const to = assertCanTransition(from, toStatus);

  subscription.status = to;
  subscription.updatedBy = actorId;

  if (to === STATUS.CANCELLED) {
    subscription.cancelledAt = subscription.cancelledAt || new Date();
    subscription.isAutoRenew = false;
    if (reason) subscription.cancelReason = reason;
  }
  if (to === STATUS.EXPIRED) {
    subscription.endedAt = subscription.endedAt || new Date();
  }
  if (to === STATUS.GRACE_PERIOD && extra.graceEndsAt) {
    subscription.graceEndsAt = extra.graceEndsAt;
  }
  if (to === STATUS.ACTIVE) {
    subscription.graceEndsAt = null;
  }

  await subscription.save();

  await recordEvent({ subscription, from, to, reason, actorId, source });
  await syncStore(subscription);

  try {
    await AuditService.logAction({
      actorType: source === "job" ? "system" : "platform_admin",
      actorId,
      module: "Platform Billing",
      action: "subscription.status_changed",
      summary: `Subscription ${subscription._id} ${from} -> ${to}${reason ? `  ${reason}` : ""}`,
      entityType: "subscription",
      entityId: subscription._id,
      storeId: subscription.storeId,
      status: "success",
      severity: AUDIT_SEVERITY[to] || "medium",
      reason: reason || null,
      oldValue: { status: from },
      newValue: { status: to },
      metadata: { source, reason: reason || null, from, to },
    });
  } catch (err) {
    logger.error(`SubscriptionStateMachine: audit echoue: ${err.message}`);
  }

  emitEvent(`subscription.${to}`, {
    storeId: subscription.storeId,
    entityId: subscription._id,
    metadata: { from, to, reason: reason || null, source },
  });

  return subscription;
};

module.exports = {
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
  STATUS,
  canTransition,
  assertCanTransition,
  transition,
};
