import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Reusable badges for statuses, severities, trends.
 */

const statusMap = {
  active: "active",
  trial: "trial",
  pending: "pending",
  past_due: "pastDue",
  suspended: "suspended",
  canceled: "canceled",
  cancelled: "canceled",
  expired: "expired",
  inactive: "inactive",
  archived: "archived",
  blocked: "blocked",
  healthy: "healthy",
  degraded: "degraded",
  warning: "warning",
  critical: "critical",
  info: "info",
  failed: "failed",
  refunded: "refunded",
  paid: "paid",
  overdue: "overdue",
  success: "success",
  sent: "sent",
};

const statusCls = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  trial: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  past_due: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  canceled: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  archived: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  healthy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  degraded: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  sent: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  refunded: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

const dotCls = {
  active: "bg-emerald-500",
  trial: "bg-sky-500",
  pending: "bg-amber-500",
  past_due: "bg-orange-500",
  suspended: "bg-red-500",
  blocked: "bg-red-500",
  critical: "bg-red-500",
  failed: "bg-red-500",
  overdue: "bg-red-500",
  canceled: "bg-gray-500",
  cancelled: "bg-gray-500",
  expired: "bg-gray-500",
  inactive: "bg-gray-500",
  archived: "bg-gray-500",
  healthy: "bg-emerald-500",
  paid: "bg-emerald-500",
  success: "bg-emerald-500",
  degraded: "bg-amber-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
  sent: "bg-sky-500",
  refunded: "bg-orange-500",
};

export const StatusBadge = ({ status, className = "" }) => {
  const { t } = useTranslation();
  const key = String(status || "").toLowerCase();
  const labelKey = statusMap[key];
  if (!labelKey) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        <span className="capitalize">{status || t("superadminDashboard.unknown")}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusCls[key]} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${dotCls[key]}`} />
      <span>{t(`superadminDashboard.${labelKey}`)}</span>
    </span>
  );
};

export const SeverityBadge = ({ severity, className = "" }) => {
  const { t } = useTranslation();
  const map = {
    critical: { cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", key: "critical" },
    high: { cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", key: "critical" },
    warning: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", key: "warning" },
    medium: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", key: "warning" },
    info: { cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300", key: "info" },
    low: { cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300", key: "info" },
  };
  const s = map[String(severity || "info").toLowerCase()] || map.info;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${s.cls} ${className}`}>
      {t(`superadminDashboard.${s.key}`)}
    </span>
  );
};

export const TrendBadge = ({ value, suffix = "%", className = "" }) => {
  const v = Number(value || 0);
  const up = v > 0;
  const down = v < 0;
  const flat = v === 0;
  const cls = up
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : down
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  const arrow = up ? "" : down ? "" : "";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls} ${className}`}>
      {arrow} {Math.abs(v).toFixed(1)}
      {suffix}
    </span>
  );
};

export const ProviderBadge = ({ name, className = "" }) => {
  const colors = {
    Stripe: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    Flouci: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    Konnect: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    "Click To Pay": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    PayPal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    Razorpay: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  };
  const cls = colors[name] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${cls} ${className}`}>
      {name}
    </span>
  );
};

