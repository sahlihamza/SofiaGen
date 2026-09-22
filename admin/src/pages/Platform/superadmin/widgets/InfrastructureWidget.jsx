import React from "react";
import { useTranslation } from "react-i18next";
import ProgressBar from "../components/ProgressBar";
import { formatNumber, formatBytes } from "../utils/format";

/**
 * Infrastructure — CPU, RAM, disk, storage, workers, queues, emails, SMS, push.
 */
const InfrastructureWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const infra = data?.infrastructure || {};

  const level = (v) => {
    if (v >= 85) return "critical";
    if (v >= 60) return "warning";
    return "ok";
  };

  const resourceMetrics = [
    { label: t("superadminDashboard.infrastructure.cpu"), value: infra.cpu || 0, max: 100, unit: "%", level: level(Number(infra.cpu) || 0) },
    { label: t("superadminDashboard.infrastructure.ram"), value: infra.ram || 0, max: 100, unit: "%", level: level(Number(infra.ram) || 0) },
    { label: t("superadminDashboard.infrastructure.disk"), value: infra.disk || 0, max: 100, unit: "%", level: level(Number(infra.disk) || 0) },
    { label: t("superadminDashboard.infrastructure.storage"), value: infra.storage || 0, max: 100, unit: "%", level: level(Number(infra.storage) || 0) },
  ];

  const counters = [
    { label: t("superadminDashboard.infrastructure.workers"), value: formatNumber(infra.workers) },
    { label: t("superadminDashboard.infrastructure.backgroundJobs"), value: formatNumber(infra.backgroundJobs) },
    { label: t("superadminDashboard.infrastructure.queueSize"), value: formatNumber(infra.queueSize) },
    { label: t("superadminDashboard.infrastructure.emailsSent"), value: formatNumber(infra.emailsSent) },
    { label: t("superadminDashboard.infrastructure.smsSent"), value: formatNumber(infra.smsSent) },
    { label: t("superadminDashboard.infrastructure.notifications"), value: formatNumber(infra.notificationsSent) },
  ];

  return (
    <div className="space-y-5">
      {/* Resource bars */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("superadminDashboard.infrastructure.resourceUsage")}
        </p>
        <div className="space-y-3">
          {resourceMetrics.map((m) => (
            <ProgressBar
              key={m.label}
              label={m.label}
              value={m.value}
              max={m.max}
              level={m.level}
              showValue={false}
            />
          ))}
        </div>
      </div>

      {/* Counters */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("superadminDashboard.infrastructure.jobsMessages")}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {counters.map((c) => (
            <div key={c.label} className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-600">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{c.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Health summary */}
      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.infrastructure.health")}</p>
        <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {resourceMetrics.some((m) => m.level === "critical")
            ? t("superadminDashboard.infrastructure.criticalDetected")
            : resourceMetrics.some((m) => m.level === "warning")
            ? t("superadminDashboard.infrastructure.highUsage")
            : t("superadminDashboard.infrastructure.allNormal")}
        </p>
      </div>
    </div>
  );
};

export default InfrastructureWidget;
