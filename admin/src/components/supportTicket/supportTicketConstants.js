// Shared between SupportTicketTable.jsx (dashboard list) and
// SupportTicketDetail.jsx (ticket detail page)  extracted so the status
// badge/select and the transition rules live in exactly one place.

// Mirrors supportTicketService.js's ALLOWED_STATUS_TRANSITIONS exactly  see
// that file for why waiting_customer->in_progress and resolved->in_progress
// are legitimate backward edges, and why closed is terminal. The backend is
// still the source of truth (rejects with 409 either way); this only keeps
// the dropdown from offering options that would fail.
export const ALLOWED_STATUS_TRANSITIONS = {
  open: ["in_progress"],
  in_progress: ["waiting_customer", "resolved"],
  waiting_customer: ["in_progress", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

export const PRIORITY_STYLES = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-50 text-blue-600",
  high: "bg-orange-50 text-orange-600",
  critical: "bg-red-50 text-red-500",
};

export const STATUS_STYLES = {
  open: "bg-emerald-50 text-emerald-600",
  in_progress: "bg-blue-50 text-blue-600",
  waiting_customer: "bg-orange-50 text-orange-600",
  resolved: "bg-gray-100 text-gray-600",
  closed: "bg-gray-600 text-white",
};

export const STATUS_LABEL_KEY = {
  open: "SupportTicketStatusOpen",
  in_progress: "SupportTicketStatusInProgress",
  waiting_customer: "SupportTicketStatusWaitingCustomer",
  resolved: "SupportTicketStatusResolved",
  closed: "SupportTicketStatusClosed",
};

export const SLA_BADGE = {
  ok: { icon: "", className: "bg-emerald-50 text-emerald-600", labelKey: "SupportTicketSlaOk" },
  warning: { icon: "", className: "bg-orange-50 text-orange-600", labelKey: "SupportTicketSlaWarning" },
  overdue: { icon: "=4", className: "bg-red-50 text-red-600", labelKey: "SupportTicketSlaOverdue" },
};

export const priorityLabelKey = (priority) =>
  `SupportTicketPriority${priority.charAt(0).toUpperCase()}${priority.slice(1)}`;

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

// Support Analytics (SUPPORT-9): backend reports durations in raw
// milliseconds (avgFirstResponseTimeMs/avgResolutionTimeMs/etc.)  this turns
// that into "Xj Yh" / "Xh Ym" / "Xm", picking the two most significant units
// rather than showing every unit down to seconds.
export const formatDurationMs = (ms) => {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "";
  const totalMinutes = Math.round(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};
