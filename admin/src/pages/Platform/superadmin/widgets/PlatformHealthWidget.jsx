import React from "react";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "../components/Badges";
import { formatUptime } from "../utils/format";

const serviceStatusKey = {
  healthy: "superadminDashboard.healthy",
  warning: "superadminDashboard.warning",
  critical: "superadminDashboard.critical",
  degraded: "superadminDashboard.degraded",
};

const serviceStatusMap = {
  healthy: { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", dot: "bg-emerald-500" },
  warning: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", dot: "bg-amber-500" },
  critical: { cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", dot: "bg-red-500" },
  degraded: { cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", dot: "bg-orange-500" },
};

/**
 * Platform Health — status of all infrastructure services.
 */
const PlatformHealthWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const health = data?.health || {};
  const services = health.services || [];

  const overallStatus = health.status || "healthy";
  const overall = serviceStatusMap[overallStatus] || serviceStatusMap.healthy;

  const counts = services.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-5">
      {/* Overall status */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-600">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("superadminDashboard.health.platformStatus")}</p>
          <p className="mt-1 text-2xl font-bold capitalize text-gray-900 dark:text-gray-100">{overallStatus}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${overall.cls}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${overall.dot}`} />
            {t(serviceStatusKey[overallStatus] || "superadminDashboard.healthy")}
          </span>
        </div>
      </div>

      {/* Alert summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-900/20">
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{health.criticalAlerts || 0}</p>
          <p className="text-xs text-red-500 dark:text-red-300">{t("superadminDashboard.health.critical")}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-900/20">
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{health.warningAlerts || 0}</p>
          <p className="text-xs text-amber-500 dark:text-amber-300">{t("superadminDashboard.health.warning")}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-900/20">
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{services.length || 0}</p>
          <p className="text-xs text-emerald-500 dark:text-emerald-300">{t("superadminDashboard.health.services")}</p>
        </div>
      </div>

      {/* Service list */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("superadminDashboard.health.services")}
        </p>
        <div className="space-y-2">
          {services.map((s) => {
            const st = serviceStatusMap[s.status] || serviceStatusMap.healthy;
            return (
              <div key={s.name} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{t("superadminDashboard.health.uptime", { uptime: formatUptime(s.uptime) })}</span>
                  <span>{t("superadminDashboard.health.latency", { latency: s.latency })}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                    {t(serviceStatusKey[s.status] || "superadminDashboard.healthy")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlatformHealthWidget;
