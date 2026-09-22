import React from "react";
import { useTranslation } from "react-i18next";
import { formatNumber, formatMoneyCompact, formatPercent, trendDirection } from "../utils/format";

/**
 * KpiCard
 *
 * Displays a single KPI metric with:
 *  - title, value, icon, color
 *  - trend direction (up/down/flat) with delta
 *  - comparison label (e.g., "vs last month")
 *  - small inline sparkline (simple CSS bar)
 *  - tooltip on hover
 */
const KpiCard = ({
  title,
  value,
  valueType = "number", // "number" | "money" | "percent"
  icon: Icon,
color = "blue",
  comparison,
  comparisonLabel,
  trend,
  sparkline = null,
  tooltip = "",
  loading = false,
  className = "",
}) => {
  const { t } = useTranslation();
  const defaultComparisonLabel = comparisonLabel || t("superadminDashboard.vsLastPeriod");
  const colorMap = {
    blue: { bg: "bg-blue-500", light: "bg-blue-50 dark:bg-blue-500/10", icon: "text-blue-600 dark:text-blue-400" },
    emerald: { bg: "bg-emerald-500", light: "bg-emerald-50 dark:bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400" },
    violet: { bg: "bg-violet-500", light: "bg-violet-50 dark:bg-violet-500/10", icon: "text-violet-600 dark:text-violet-400" },
    orange: { bg: "bg-orange-500", light: "bg-orange-50 dark:bg-orange-500/10", icon: "text-orange-600 dark:text-orange-400" },
    red: { bg: "bg-red-500", light: "bg-red-50 dark:bg-red-500/10", icon: "text-red-600 dark:text-red-400" },
    indigo: { bg: "bg-indigo-500", light: "bg-indigo-50 dark:bg-indigo-500/10", icon: "text-indigo-600 dark:text-indigo-400" },
    cyan: { bg: "bg-cyan-500", light: "bg-cyan-50 dark:bg-cyan-500/10", icon: "text-cyan-600 dark:text-cyan-400" },
    amber: { bg: "bg-amber-500", light: "bg-amber-50 dark:bg-amber-500/10", icon: "text-amber-600 dark:text-amber-400" },
    gray: { bg: "bg-gray-500", light: "bg-gray-50 dark:bg-gray-500/10", icon: "text-gray-600 dark:text-gray-400" },
  };

  const colors = colorMap[color] || colorMap.blue;

  const formatValue = (v) => {
    if (valueType === "money") return formatMoneyCompact(v);
    if (valueType === "percent") return formatPercent(v);
    return formatNumber(v);
  };

  const trendColor = trend === "up" ? "text-emerald-600 dark:text-emerald-400" : trend === "down" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400";
  const trendIcon = trend === "up" ? "" : trend === "down" ? "" : "";

  return (
    <div
      className={`relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${className}`}
      title={tooltip || undefined}
    >
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {title}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatValue(value)}
              </p>
            </div>
            {Icon && (
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors.light}`}>
                <Icon className={`h-5 w-5 ${colors.icon}`} />
              </div>
            )}
          </div>

          {/* Sparkline (mini bar chart) */}
          {sparkline && Array.isArray(sparkline) && sparkline.length > 0 && (
            <div className="mt-3 flex items-end gap-[2px] h-8">
              {sparkline.map((v, i) => {
                const max = Math.max(...sparkline, 1);
                const h = Math.max((v / max) * 100, 5);
                const isHigher = v > (sparkline[Math.max(0, i - 1)] || 0);
                return (
                  <div
                    key={i}
                    className={`w-1.5 rounded-t transition-all ${isHigher ? "bg-emerald-400" : "bg-gray-300 dark:bg-gray-600"}`}
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
          )}

          {/* Comparison */}
          {(comparison !== undefined || trend) && (
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              {trend && (
                <span className={`font-semibold ${trendColor}`}>
                  {trendIcon} {formatPercent(Math.abs(comparison || 0), 1)}
                </span>
              )}
              {defaultComparisonLabel && (
                <span className="text-gray-400 dark:text-gray-500">{defaultComparisonLabel}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default KpiCard;
