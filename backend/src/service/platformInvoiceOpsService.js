const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const AuditService = require("./AuditService");
const { emitEvent } = require("../lib/eventBus");
const { requireReason } = require("../utils/requireReason");

const MARK_PAID_FROM = ["draft", "sent", "overdue"];
const VOID_FROM = ["draft", "sent", "overdue"];

const badRequest = (m) => { const e = new Error(m); e.code = "BAD_REQUEST"; return e; };
const notFound = (m) => { const e = new Error(m); e.code = "NOT_FOUND"; return e; };
const conflict = (m) => { const e = new Error(m); e.code = "CONFLICT"; return e; };

const loadInvoice = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) throw badRequest("Identifiant de facture invalide");
  const invoice = await Invoice.findById(id);
  if (!invoice) throw notFound("Facture introuvable");
  return invoice;
};

const auditInvoice = async ({ action, invoice, actorId, reason, oldValue, newValue, severity }) => {
  await AuditService.logAction({
    actorType: "platform_admin",
    actorId: actorId || null,
    module: "Platform Billing",
    action: "invoice." + action,
    summary: "Invoice " + invoice.invoiceNumber + " " + action + (reason ? " - " + reason : ""),
    entityType: "invoice",
    entityId: invoice._id,
    storeId: invoice.storeId,
    status: "success",
    severity,
    reason: reason || null,
    oldValue,
    newValue,
    metadata: { invoiceNumber: invoice.invoiceNumber, reason },
  });
};

const markPaid = async (id, { reason, actorId = null, paymentId = null } = {}) => {
  const motif = requireReason(reason, "mark-paid");
  const invoice = await loadInvoice(id);

  if (invoice.status === "paid") throw conflict("Cette facture est deja payee");
  if (!MARK_PAID_FROM.includes(invoice.status)) {
    throw conflict(
      'Impossible de marquer payee une facture au statut "' + invoice.status +
      '". Statuts autorises : ' + MARK_PAID_FROM.join(", ")
    );
  }

  const previousStatus = invoice.status;
  const paidAt = new Date();
  invoice.status = "paid";
  invoice.paidAt = paidAt;
  if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) invoice.paymentId = paymentId;
  await invoice.save();

  await auditInvoice({
    action: "mark_paid",
    invoice,
    actorId,
    reason: motif,
    oldValue: { status: previousStatus, paidAt: null },
    newValue: { status: "paid", paidAt },
    severity: "critical",
  });

  emitEvent("invoice.marked_paid", {
    storeId: invoice.storeId,
    entityId: invoice._id,
    metadata: { invoiceNumber: invoice.invoiceNumber, total: invoice.total, reason: motif },
  });

  return invoice;
};

const voidInvoice = async (id, { reason, actorId = null } = {}) => {
  const motif = requireReason(reason, "void");
  const invoice = await loadInvoice(id);

  if (invoice.status === "canceled") throw conflict("Cette facture est deja annulee");
  if (invoice.status === "paid") throw conflict("Une facture payee ne peut pas etre annulee, emettez un avoir");
  if (!VOID_FROM.includes(invoice.status)) {
    throw conflict(
      'Impossible d annuler une facture au statut "' + invoice.status +
      '". Statuts autorises : ' + VOID_FROM.join(", ")
    );
  }

  const previousStatus = invoice.status;
  invoice.status = "canceled";
  invoice.metadata = Object.assign({}, invoice.metadata || {}, {
    voidedAt: new Date(),
    voidReason: motif,
  });
  await invoice.save();

  await auditInvoice({
    action: "void",
    invoice,
    actorId,
    reason: motif,
    oldValue: { status: previousStatus },
    newValue: { status: "canceled" },
    severity: "critical",
  });

  emitEvent("invoice.voided", {
    storeId: invoice.storeId,
    entityId: invoice._id,
    metadata: { invoiceNumber: invoice.invoiceNumber, reason: motif },
  });

  return invoice;
};

module.exports = { markPaid, voidInvoice, MARK_PAID_FROM, VOID_FROM };
