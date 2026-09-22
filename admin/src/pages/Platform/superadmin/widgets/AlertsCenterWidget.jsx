import React from "react";
import { useTranslation } from "react-i18next";
import { FiAlertTriangle, FiCheckCircle, FiExternalLink } from "react-icons/fi";
import { SeverityBadge } from "../components/Badges";
import { timeAgo } from "../utils/format";

const severityColor = {
  critical: "border-l-red-500 bg-red-50/50 dark:bg-red-900/10",
  warning: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10",
  info: "border-l-sky-500 bg-sky-50/50 dark:bg-sky-900/10",
};

/**
 * Alert Center — platform alerts with severity, source, and quick actions.
 */
const AlertsCenterWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const alerts = data?.alerts || [];

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  if (!alerts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <FiCheckCircle className="h-10 w-10 text-emerald-500" />
        <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t("superadminDashboard.alerts.allOperational")}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.alerts.noActiveAlerts")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, idx) => (
        <div
          key={`${alert.type}-${idx}`}
          className={`flex items-start gap-3 rounded-r-lg border-l-4 p-3 ${severityColor[alert.severity] || severityColor.info}`}
        >
          <div className="mt-0.5 shrink-0">
            {alert.severity === "critical" ? (
              <FiAlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <FiAlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{alert.message}</p>
              <SeverityBadge severity={alert.severity} />
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("superadminDashboard.alerts.source", { source: alert.source || alert.type })}
                {alert.count ? t("superadminDashboard.alerts.items", { count: alert.count }) : ""}
              </p>
              <div className="flex items-center gap-2">
                {alert.action && (
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {alert.action} <FiExternalLink className="h-3 w-3" />
                  </a>
                )}
                <span className="text-xs text-gray-400">{timeAgo(alert.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertsCenterWidget;
