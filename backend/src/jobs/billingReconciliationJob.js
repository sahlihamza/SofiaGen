const crypto = require("crypto");
const logger = require("../config/logger");
const JobLogService = require("../service/JobLogService");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const AuditService = require("../service/AuditService");
const SubscriptionStateMachine = require("../service/SubscriptionStateMachine");
const InvoiceStateMachine = require("../service/InvoiceStateMachine");
const BillingReconciliationService = require("../service/BillingReconciliationService");
const { STATUS: SUB_STATUS, expandForQuery } = require("../utils/subscriptionStatus");

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

const newCorrelationId = () => `recon-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

const expireStaleTrials = async ({ correlationId, reference = new Date() }) => {
  const stale = await Subscription.find({
    status: { $in: expandForQuery([SUB_STATUS.TRIALING]) },
    trialEndsAt: { $ne: null, $lte: reference },
  }).select("_id storeId");

  let transitioned = 0;
  for (const sub of stale) {
    try {
      await SubscriptionStateMachine.transition(sub._id, SUB_STATUS.EXPIRED, {
        source: "job",
        reason: "trial_expired_uncaught",
        correlationId,
      });
      transitioned += 1;
    } catch (err) {
      logger.error(`billingReconciliationJob: expiration de ${sub._id} refusee: ${err.message}`);
    }
  }

  return { scanned: stale.length, transitioned };
};

const flagOverdueInvoices = async ({ correlationId, reference = new Date() }) => {
  const overdue = await Invoice.find({
    status: { $in: InvoiceStateMachine.expandForQuery(["open"]) },
    dueDate: { $ne: null, $lt: reference },
  }).select("_id storeId");

  let transitioned = 0;
  for (const invoice of overdue) {
    try {
      await InvoiceStateMachine.transition(invoice._id, InvoiceStateMachine.STATUS.PAST_DUE, {
        source: "job",
        reason: "due_date_passed",
        correlationId,
      });
      transitioned += 1;
    } catch (err) {
      logger.error(`billingReconciliationJob: facture ${invoice._id} non transitionnee: ${err.message}`);
    }
  }

  return { scanned: overdue.length, transitioned };
};

const runBillingReconciliation = async ({ reference = new Date() } = {}) => {
  const correlationId = newCorrelationId();

  const trials = await expireStaleTrials({ correlationId, reference });
  const invoices = await flagOverdueInvoices({ correlationId, reference });
  const anomalyReport = await BillingReconciliationService.detectAnomalies({ reference });

  const summary = {
    correlationId,
    trialsScanned: trials.scanned,
    trialsExpired: trials.transitioned,
    invoicesScanned: invoices.scanned,
    invoicesFlaggedPastDue: invoices.transitioned,
    anomaliesFound: anomalyReport.total,
    anomaliesByType: anomalyReport.byType,
    corrections: trials.transitioned + invoices.transitioned,
  };

  try {
    await AuditService.logAction({
      actorType: "system",
      module: "Platform Billing",
      action: "billing_reconciliation_run",
      summary: `Reconciliation: ${summary.corrections} correction(s), ${summary.anomaliesFound} anomalie(s)`,
      entityType: "billing",
      status: "success",
      severity: summary.anomaliesFound > 0 ? "medium" : "low",
      metadata: summary,
    });
  } catch (err) {
    logger.error(`billingReconciliationJob: audit echoue: ${err.message}`);
  }

  if (summary.corrections > 0 || summary.anomaliesFound > 0) {
    logger.info(
      `billingReconciliationJob: trials=${summary.trialsExpired} invoices=${summary.invoicesFlaggedPastDue} anomalies=${summary.anomaliesFound}`
    );
  }

  return summary;
};

const startBillingReconciliationJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (process.env.ENABLE_BILLING_RECONCILIATION_JOB !== "true") {
    logger.info(
      "billingReconciliationJob: disabled (set ENABLE_BILLING_RECONCILIATION_JOB=true in .env to enable)."
    );
    return null;
  }

  const runSafely = () => {
    JobLogService.runJob("billingReconciliationJob", runBillingReconciliation).catch((err) =>
      logger.error("billingReconciliationJob failed:", err.message)
    );
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = {
  startBillingReconciliationJob,
  runBillingReconciliation,
  expireStaleTrials,
  flagOverdueInvoices,
  newCorrelationId,
};
