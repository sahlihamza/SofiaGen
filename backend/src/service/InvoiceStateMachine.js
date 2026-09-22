const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const AuditService = require("./AuditService");
const logger = require("../config/logger");
const { emitEvent } = require("../lib/eventBus");

const STATUS = {
  DRAFT: "draft",
  ISSUED: "issued",
  OPEN: "open",
  PAST_DUE: "past_due",
  PAID: "paid",
  VOID: "void",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};

const CANONICAL_STATUSES = Object.values(STATUS);

const LEGACY_ALIASES = {
  sent: STATUS.OPEN,
  overdue: STATUS.PAST_DUE,
  canceled: STATUS.CANCELLED,
};

const ALL_ACCEPTED_STATUSES = [...CANONICAL_STATUSES, ...Object.keys(LEGACY_ALIASES)];

const ALLOWED_TRANSITIONS = {
  [STATUS.DRAFT]: [STATUS.ISSUED, STATUS.CANCELLED],
  [STATUS.ISSUED]: [STATUS.OPEN, STATUS.VOID],
  [STATUS.OPEN]: [STATUS.PAID, STATUS.PAST_DUE, STATUS.VOID],
  [STATUS.PAST_DUE]: [STATUS.PAID, STATUS.VOID],
  [STATUS.PAID]: [STATUS.REFUNDED],
  [STATUS.VOID]: [],
  [STATUS.CANCELLED]: [],
  [STATUS.REFUNDED]: [],
};

const TERMINAL_STATUSES = CANONICAL_STATUSES.filter(
  (s) => ALLOWED_TRANSITIONS[s].length === 0
);

const AUDIT_SEVERITY = {
  [STATUS.PAID]: "critical",
  [STATUS.REFUNDED]: "critical",
  [STATUS.VOID]: "high",
  [STATUS.CANCELLED]: "high",
  [STATUS.PAST_DUE]: "medium",
  [STATUS.ISSUED]: "low",
  [STATUS.OPEN]: "low",
};

const normalizeStatus = (status) => {
  if (status === null || status === undefined) return null;
  const raw = String(status).trim().toLowerCase();
  return LEGACY_ALIASES[raw] || raw;
};

const expandForQuery = (statuses) => {
  const list = Array.isArray(statuses) ? statuses : [statuses];
  const out = new Set();
  for (const s of list) {
    const canonical = normalizeStatus(s);
    if (!canonical) continue;
    out.add(canonical);
    for (const [legacy, target] of Object.entries(LEGACY_ALIASES)) {
      if (target === canonical) out.add(legacy);
    }
  }
  return [...out];
};

const canTransition = (from, to) => {
  const f = normalizeStatus(from);
  const t = normalizeStatus(to);
  if (!f || !t) return false;
  if (!CANONICAL_STATUSES.includes(t)) return false;
  return (ALLOWED_TRANSITIONS[f] || []).includes(t);
};

const invalidTransition = (from, to) => {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  const err = new Error(
    `Transition de facture interdite : "${from}" -> "${to}". Autorisés depuis "${from}" : ${
      allowed.length ? allowed.join(", ") : "aucune (statut terminal)"
    }`
  );
  err.status = 409;
  err.code = "INVALID_INVOICE_TRANSITION";
  err.from = from;
  err.to = to;
  return err;
};

const assertCanTransition = (from, to) => {
  const f = normalizeStatus(from);
  const t = normalizeStatus(to);
  if (!CANONICAL_STATUSES.includes(t)) {
    const err = new Error(`Statut de facture inconnu : "${to}"`);
    err.status = 400;
    err.code = "UNKNOWN_INVOICE_STATUS";
    throw err;
  }
  if (!canTransition(f, t)) throw invalidTransition(f, t);
  return t;
};

const transition = async (invoiceId, toStatus, { reason, actorId = null, source = "manual" } = {}) => {
  if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
    const err = new Error("Identifiant de facture invalide");
    err.status = 400;
    err.code = "BAD_REQUEST";
    throw err;
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    const err = new Error("Facture introuvable");
    err.status = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const from = normalizeStatus(invoice.status);
  const to = assertCanTransition(from, toStatus);

  invoice.status = to;
  if (to === STATUS.PAID) invoice.paidAt = invoice.paidAt || new Date();
  if (to === STATUS.ISSUED) invoice.issuedAt = invoice.issuedAt || new Date();
  if (to === STATUS.VOID || to === STATUS.CANCELLED) {
    invoice.metadata = { ...(invoice.metadata || {}), voidedAt: new Date(), voidReason: reason || null };
  }

  await invoice.save();

  try {
    await AuditService.logAction({
      actorType: source === "job" ? "system" : "platform_admin",
      actorId,
      module: "Platform Billing",
      action: "invoice.status_changed",
      summary: `Invoice ${invoice.invoiceNumber} ${from} -> ${to}${reason ? `  ${reason}` : ""}`,
      entityType: "invoice",
      entityId: invoice._id,
      storeId: invoice.storeId,
      status: "success",
      severity: AUDIT_SEVERITY[to] || "medium",
      oldValue: { status: from },
      newValue: { status: to },
      metadata: { source, reason: reason || null, from, to },
    });
  } catch (err) {
    logger.error(`InvoiceStateMachine: audit echoue: ${err.message}`);
  }

  emitEvent(`invoice.${to}`, {
    storeId: invoice.storeId,
    entityId: invoice._id,
    metadata: { from, to, reason: reason || null, source },
  });

  return invoice;
};

const buildPlanSnapshot = (plan, planVersion = null, planPrice = null) => ({
  name: plan?.name || null,
  slug: plan?.slug || null,
  version: planVersion?.version ?? plan?.version ?? null,
  planVersionId: planVersion?._id || null,
  planPriceId: planPrice?._id || null,
  price: planPrice?.price ?? null,
  currency: planPrice?.currency || null,
  cycle: planPrice?.cycle || null,
  snapshotAt: new Date(),
});

module.exports = {
  STATUS,
  CANONICAL_STATUSES,
  LEGACY_ALIASES,
  ALL_ACCEPTED_STATUSES,
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
  normalizeStatus,
  expandForQuery,
  canTransition,
  assertCanTransition,
  transition,
  buildPlanSnapshot,
};
