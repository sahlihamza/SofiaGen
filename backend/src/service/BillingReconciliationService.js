const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const InvoiceStateMachine = require("./InvoiceStateMachine");

const ANOMALY_TYPES = {
  INVOICE_PAID_PAYMENT_MISMATCH: "INVOICE_PAID_PAYMENT_MISMATCH",
  INVOICE_OVERDUE_NO_PAYMENT: "INVOICE_OVERDUE_NO_PAYMENT",
};

const SUCCESSFUL_PAYMENT_STATUSES = ["succeeded", "success", "paid", "completed"];

const detectPaidWithoutSuccessfulPayment = async ({ storeId } = {}) => {
  const query = { status: { $in: InvoiceStateMachine.expandForQuery(["paid"]) } };
  if (storeId) query.storeId = storeId;

  const invoices = await Invoice.find(query)
    .select("_id invoiceNumber storeId total currency paidAt")
    .lean();

  const anomalies = [];
  for (const invoice of invoices) {
    const payment = await Payment.findOne({ invoiceId: invoice._id }).sort({ createdAt: -1 }).lean();

    if (!payment || !SUCCESSFUL_PAYMENT_STATUSES.includes(String(payment.status || "").toLowerCase())) {
      anomalies.push({
        type: ANOMALY_TYPES.INVOICE_PAID_PAYMENT_MISMATCH,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        storeId: invoice.storeId,
        total: invoice.total,
        currency: invoice.currency,
        paymentStatus: payment ? payment.status : null,
        detail: payment
          ? `Facture payé mais paiement au statut "${payment.status}"`
          : "Facture payé sans aucun paiement rattaché",
      });
    }
  }

  return anomalies;
};

const detectOverdueWithoutPayment = async ({ storeId, reference = new Date() } = {}) => {
  const query = {
    status: { $in: InvoiceStateMachine.expandForQuery(["open", "issued", "past_due"]) },
    dueDate: { $ne: null, $lt: reference },
  };
  if (storeId) query.storeId = storeId;

  const invoices = await Invoice.find(query)
    .select("_id invoiceNumber storeId total currency dueDate status")
    .lean();

  return invoices.map((invoice) => ({
    type: ANOMALY_TYPES.INVOICE_OVERDUE_NO_PAYMENT,
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    storeId: invoice.storeId,
    total: invoice.total,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    status: invoice.status,
    detail: `Facture "${invoice.status}" échue le ${invoice.dueDate?.toISOString?.().slice(0, 10)} sans paiement`,
  }));
};

const detectAnomalies = async ({ storeId, reference = new Date() } = {}) => {
  const [mismatches, overdue] = await Promise.all([
    detectPaidWithoutSuccessfulPayment({ storeId }),
    detectOverdueWithoutPayment({ storeId, reference }),
  ]);

  const anomalies = [...mismatches, ...overdue];

  return {
    generatedAt: new Date(),
    total: anomalies.length,
    byType: {
      [ANOMALY_TYPES.INVOICE_PAID_PAYMENT_MISMATCH]: mismatches.length,
      [ANOMALY_TYPES.INVOICE_OVERDUE_NO_PAYMENT]: overdue.length,
    },
    anomalies,
  };
};

module.exports = {
  ANOMALY_TYPES,
  SUCCESSFUL_PAYMENT_STATUSES,
  detectAnomalies,
  detectPaidWithoutSuccessfulPayment,
  detectOverdueWithoutPayment,
};
