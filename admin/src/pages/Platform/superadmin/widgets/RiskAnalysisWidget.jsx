import React from "react";
import { useTranslation } from "react-i18next";
import { FiAlertTriangle, FiShoppingCart, FiPauseCircle, FiActivity, FiClock, FiAlertCircle, FiTrendingDown } from "react-icons/fi";
import { formatNumber } from "../utils/format";

/**
 * Risk Analysis — stores without orders, inactive, quota exceeded, expiring, errors.
 */
const RiskAnalysisWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const risk = data?.risk || {};

  const items = [
    {
      label: t("superadminDashboard.risk.noOrderStores"),
      value: risk.noOrderStores || 0,
      icon: FiShoppingCart,
      color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
      level: risk.noOrderStores > 0 ? "warning" : "ok",
    },
    {
      label: t("superadminDashboard.risk.inactiveStores"),
      value: risk.inactiveStores || 0,
      icon: FiPauseCircle,
      color: "bg-gray-50 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400",
      level: "info",
    },
    {
      label: t("superadminDashboard.risk.quotaExceeded"),
      value: risk.quotaExceeded || 0,
      icon: FiActivity,
      color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
      level: risk.quotaExceeded > 0 ? "critical" : "ok",
    },
    {
      label: t("superadminDashboard.risk.apiErrors"),
      value: risk.apiErrors || 0,
      icon: FiAlertCircle,
      color: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
      level: risk.apiErrors > 0 ? "warning" : "ok",
    },
    {
      label: t("superadminDashboard.risk.subsExpiring"),
      value: risk.subscriptionsExpiring || 0,
      icon: FiClock,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
      level: risk.subscriptionsExpiring > 0 ? "warning" : "ok",
    },
    {
      label: t("superadminDashboard.risk.churnRisk"),
      value: `${data?.advancedMetrics?.churnRate || 0}%`,
      icon: FiTrendingDown,
      color: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
      level: (data?.advancedMetrics?.churnRate || 0) > 5 ? "critical" : "ok",
    },
  ];

  const criticalCount = items.filter((i) => i.level === "critical").length;
  const warningCount = items.filter((i) => i.level === "warning").length;

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <FiAlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("superadminDashboard.risk.summary")}</span>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="font-semibold text-red-600 dark:text-red-400">{t("superadminDashboard.risk.criticalCount", { count: criticalCount })}</span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">{t("superadminDashboard.risk.warningCount", { count: warningCount })}</span>
        </div>
      </div>

      {/* Risk items */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskAnalysisWidget;
