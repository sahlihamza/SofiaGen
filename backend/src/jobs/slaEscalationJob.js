const logger = require("../config/logger");
const SupportTicket = require("../models/SupportTicket");
const supportTicketService = require("../service/supportTicketService");
const { emitEvent } = require("../lib/eventBus");

// SFG-80 Phase 4  same pattern as subscriptionExpiryJob.js: a periodic
// sweep that emits events for a job to pick up, rather than a bespoke
// notification path. Checked every 10 minutes rather than
// subscriptionExpiryJob's 6h  SLA windows here can be as short as 1h
// (critical priority), so a coarser interval could skip the warning window
// entirely between runs.
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const OPEN_STATUSES = ["open", "in_progress", "waiting_customer"];

// Dedup relies entirely on notify()'s existing deduplicationKey unique index
// (see notificationService.js) rather than a new "already notified" flag on
// the ticket  a static, non-time-bucketed key per (event, ticket) means the
// first successful notify() call "claims" it and every later run's attempt
// hits the same unique index and is silently skipped (E11000 -> continue).
// No new schema field needed, no separate dedup bookkeeping to keep in sync.
const checkSlaWarnings = async () => {
  const now = new Date();
  const warningThreshold = new Date(now.getTime() + supportTicketService.SLA_WARNING_WINDOW_MS);

  // Unassigned tickets are skipped  there's no team-wide fallback recipient
  // for SLA escalation specifically (unlike ticket.created, which already
  // notifies the store's support roles). An unassigned ticket sliding
  // towards its deadline is arguably a worse problem than this job covers.
  const warning = await SupportTicket.find({
    status: { $in: OPEN_STATUSES },
    assignedTo: { $ne: null },
    "sla.resolutionDeadline": { $gt: now, $lte: warningThreshold },
  }).select("_id storeId ticketNumber assignedTo");

  for (const ticket of warning) {
    emitEvent("ticket.sla_warning", {
      storeId: ticket.storeId,
      entityId: ticket._id,
      recipients: [ticket.assignedTo],
      metadata: { ticketNumber: ticket.ticketNumber },
      actionUrl: `/support-tickets/${ticket._id}`,
      deduplicationKey: `ticket.sla_warning:${ticket._id}`,
    });
  }

  return warning.length;
};

const checkSlaOverdue = async () => {
  const now = new Date();

  // No supervisor/manager-hierarchy concept exists on User or Role (see
  // NotificationEventHandler.js for the same note)  overdue still targets
  // the assigned agent, at "critical" priority via the ticket.sla_overdue
  // event config instead of a different recipient. Revisit once such a
  // concept exists.
  const overdue = await SupportTicket.find({
    status: { $in: OPEN_STATUSES },
    assignedTo: { $ne: null },
    "sla.resolutionDeadline": { $lt: now },
  }).select("_id storeId ticketNumber assignedTo");

  for (const ticket of overdue) {
    emitEvent("ticket.sla_overdue", {
      storeId: ticket.storeId,
      entityId: ticket._id,
      recipients: [ticket.assignedTo],
      metadata: { ticketNumber: ticket.ticketNumber },
      actionUrl: `/support-tickets/${ticket._id}`,
      deduplicationKey: `ticket.sla_overdue:${ticket._id}`,
    });
  }

  return overdue.length;
};

const runSlaEscalationCheck = async () => {
  const warningCount = await checkSlaWarnings();
  const overdueCount = await checkSlaOverdue();

  if (warningCount + overdueCount > 0) {
    logger.info(`slaEscalationJob: warning=${warningCount} overdue=${overdueCount}`);
  }
};

const startSlaEscalationJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (process.env.ENABLE_SLA_ESCALATION_JOB !== "true") {
    logger.info(
      "slaEscalationJob: disabled (set ENABLE_SLA_ESCALATION_JOB=true in .env to enable)."
    );
    return null;
  }

  const runSafely = () => {
    runSlaEscalationCheck().catch((err) => logger.error("slaEscalationJob failed:", err.message));
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = {
  startSlaEscalationJob,
  runSlaEscalationCheck,
  checkSlaWarnings,
  checkSlaOverdue,
};
