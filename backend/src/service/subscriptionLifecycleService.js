const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const Store = require("../models/Store");
const AuditService = require("./AuditService");
const { emitEvent } = require("../lib/eventBus");
const { requireReason, optionalReason } = require("../utils/requireReason");
const { createSubscriptionEvent } = require("./SubscriptionService");

const TRANSITIONS = {
  pending: ["trial", "active", "canceled", "expired"],
  trial: ["active", "past_due", "suspended", "canceled", "expired"],
  active: ["past_due", "suspended", "canceled", "expired"],
  past_due: ["active", "suspended", "canceled", "expired"],
  suspended: ["active", "canceled", "expired"],
  canceled: [],
  expired: [],
};

const TERMINAL_STATUSES = Object.keys(TRANSITIONS).filter((s) => TRANSITIONS[s].length === 0);

const AUDIT_SEVERITY = {
  cancel: "critical",
  suspend: "critical",
  force_status: "critical",
  extend_trial: "medium",
  assign_plan: "medium",
  resume: "low",
  activate: "low",
};

const badRequest = (message) => {
  const err = new Error(message);
  err.code = "BAD_REQUEST";
  return err;
};

const notFound = (message) => {
  const err = new Error(message);
  err.code = "NOT_FOUND";
  return err;
};

const conflict = (message) => {
  const err = new Error(message);
  err.code = "CONFLICT";
  return err;
};

const canTransition = (from, to) => {
  if (!TRANSITIONS[from]) return false;
  return TRANSITIONS[from].includes(to);
};

const assertTransition = (from, to) => {
  if (from === to) {
    throw conflict(`L'abonnement est déjà au statut "${to}"`);
  }
  if (!TRANSITIONS[to]) {
    throw badRequest(`Statut cible inconnu : "${to}"`);
  }
  if (!canTransition(from, to)) {
    const allowed = TRANSITIONS[from] || [];
    const allowedLabel = allowed.length ? allowed.join(", ") : "aucune (statut terminal)";
    throw conflict(
      `Transition interdite : "${from}" -> "${to}". Transitions autorisés depuis "${from}" : ${allowedLabel}`
    );
  }
};

const loadSubscription = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw badRequest("Identifiant d'abonnement invalide");
  }
  const subscription = await Subscription.findById(id);
  if (!subscription) throw notFound("Abonnement introuvable");
  return subscription;
};

const auditLifecycle = async ({ action, subscription, actorId, reason, oldValue, newValue, metadata }) => {
  await AuditService.logAction({
    actorType: "platform_admin",
    actorId: actorId || null,
    module: "Platform Billing",
    action: `subscription.${action}`,
    summary: `Subscription ${subscription._id} ${action}${reason ? `  ${reason}` : ""}`,
    entityType: "subscription",
    entityId: subscription._id,
    storeId: subscription.storeId,
    status: "success",
    severity: AUDIT_SEVERITY[action] || "medium",
    reason: reason || null,
    oldValue,
    newValue,
    metadata: { ...(metadata || {}), ...(reason ? { reason } : {}) },
  });
};

const syncStoreStatus = async (subscription) => {
  const store = await Store.findById(subscription.storeId).select("subscriptionStatus");
  if (!store) return;
  store.subscriptionStatus = subscription.status;
  await store.save();
};

const changeStatus = async (id, targetStatus, { reason, actorId = null, force = false, action } = {}) => {
  const subscription = await loadSubscription(id);
  const from = subscription.status;

  if (!force) {
    assertTransition(from, targetStatus);
  } else if (!TRANSITIONS[targetStatus]) {
    throw badRequest(`Statut cible inconnu : "${targetStatus}"`);
  }

  subscription.status = targetStatus;
  subscription.updatedBy = actorId;

  await createSubscriptionEvent(
    subscription,
    action || targetStatus,
    `Subscription ${from} -> ${targetStatus}${reason ? `: ${reason}` : ""}`,
    { from, to: targetStatus, forced: force },
    actorId
  );
  await subscription.save();
  await syncStoreStatus(subscription);

  await auditLifecycle({
    action: action || "force_status",
    subscription,
    actorId,
    reason,
    oldValue: { status: from },
    newValue: { status: targetStatus },
    metadata: { forced: force },
  });

  return subscription;
};

const suspendSubscription = async (id, { reason, actorId = null } = {}) => {
  const motif = requireReason(reason, "suspend");
  const subscription = await changeStatus(id, "suspended", {
    reason: motif,
    actorId,
    action: "suspend",
  });
  emitEvent("subscription.suspended", {
    storeId: subscription.storeId,
    entityId: subscription._id,
    metadata: { reason: motif },
  });
  return subscription;
};

const resumeSubscription = async (id, { reason, actorId = null } = {}) => {
  const subscription = await changeStatus(id, "active", {
    reason: optionalReason(reason),
    actorId,
    action: "resume",
  });
  emitEvent("subscription.resumed", {
    storeId: subscription.storeId,
    entityId: subscription._id,
    metadata: {},
  });
  return subscription;
};

const cancelSubscription = async (id, { mode = "at_period_end", reason, actorId = null } = {}) => {
  if (!["at_period_end", "immediate"].includes(mode)) {
    throw badRequest('mode doit valoir "at_period_end" ou "immediate"');
  }
  const motif = requireReason(reason, "cancel");
  const subscription = await loadSubscription(id);
  const from = subscription.status;

  if (TERMINAL_STATUSES.includes(from)) {
    throw conflict(`L'abonnement est déjà "${from}"`);
  }

  if (mode === "immediate") {
    assertTransition(from, "canceled");
    subscription.status = "canceled";
    subscription.cancelledAt = new Date();
    subscription.endedAt = new Date();
  } else {
    if (subscription.cancelAtPeriodEnd) {
      throw conflict("Une annulation en fin de période est déjà programmé");
    }
    subscription.cancelAtPeriodEnd = true;
    subscription.scheduledCancellationAt = subscription.currentPeriodEnd || null;
  }

  subscription.cancelReason = motif;
  subscription.isAutoRenew = false;
  subscription.updatedBy = actorId;

  await createSubscriptionEvent(
    subscription,
    "canceled",
    `Subscription cancel (${mode}): ${motif}`,
    { mode, from },
    actorId
  );
  await subscription.save();

  if (mode === "immediate") await syncStoreStatus(subscription);

  await auditLifecycle({
    action: "cancel",
    subscription,
    actorId,
    reason: motif,
    oldValue: { status: from, cancelAtPeriodEnd: false },
    newValue: {
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
    },
    metadata: { mode },
  });

  emitEvent("subscription.cancelled", {
    storeId: subscription.storeId,
    entityId: subscription._id,
    metadata: { mode, reason: motif },
  });

  return subscription;
};

const extendTrial = async (id, { days, reason, actorId = null } = {}) => {
  const motif = requireReason(reason, "extend-trial");
  const extraDays = Number(days);
  if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > 365) {
    throw badRequest("days doit être un entier entre 1 et 365");
  }

  const subscription = await loadSubscription(id);
  if (!["trial", "pending"].includes(subscription.status)) {
    throw conflict(
      `Seul un abonnement en essai peut être prolong (statut actuel : "${subscription.status}")`
    );
  }

  const current = subscription.trialEndsAt || subscription.trialEndDate || new Date();
  const base = current > new Date() ? current : new Date();
  const newEnd = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);

  const previousEnd = subscription.trialEndsAt;
  subscription.trialEndsAt = newEnd;
  subscription.trialEndDate = newEnd;
  subscription.trialPeriod = true;
  subscription.updatedBy = actorId;

  await createSubscriptionEvent(
    subscription,
    "trial_extended",
    `Trial extended by ${extraDays} day(s): ${motif}`,
    { days: extraDays, previousEnd, newEnd },
    actorId
  );
  await subscription.save();

  await auditLifecycle({
    action: "extend_trial",
    subscription,
    actorId,
    reason: motif,
    oldValue: { trialEndsAt: previousEnd },
    newValue: { trialEndsAt: newEnd },
    metadata: { days: extraDays },
  });

  emitEvent("subscription.trial_extended", {
    storeId: subscription.storeId,
    entityId: subscription._id,
    metadata: { days: extraDays, newEnd },
  });

  return subscription;
};

const forceStatus = async (id, { status, reason, actorId = null } = {}) => {
  const motif = requireReason(reason, "force-status");
  if (!status || !TRANSITIONS[status]) {
    throw badRequest(`Statut cible inconnu : "${status}"`);
  }
  return changeStatus(id, status, {
    reason: motif,
    actorId,
    force: true,
    action: "force_status",
  });
};

module.exports = {
  TRANSITIONS,
  TERMINAL_STATUSES,
  canTransition,
  assertTransition,
  changeStatus,
  suspendSubscription,
  resumeSubscription,
  cancelSubscription,
  extendTrial,
  forceStatus,
};
