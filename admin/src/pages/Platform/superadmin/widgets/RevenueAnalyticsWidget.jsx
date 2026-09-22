import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AreaChart, BarChart } from "../components/Charts";
import { TrendBadge } from "../components/Badges";
import { formatMoney, formatCompact } from "../utils/format";
import { CButton } from "@/components/ui";

const CHART_TYPES = [
  { value: "area", labelKey: "superadminDashboard.revenue.area" },
  { value: "bar", labelKey: "superadminDashboard.revenue.bars" },
  { value: "line", labelKey: "superadminDashboard.revenue.line" },
];

const RANGES = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "12m", label: "12M" },
];

/**
 * Revenue Analytics — the main revenue chart.
 * Supports area/bar/line, 7d/30d/90d/12m ranges.
 */
const RevenueAnalyticsWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const [chartType, setChartType] = useState("area");
  const [range, setRange] = useState("30d");

  const revenue = data?.revenue || {};

  const { labels, values, forecastValues, prevValues } = useMemo(() => {
    let labels = [];
    let values = [];
    let forecastValues = [];

    if (range === "7d") {
      const daily = (revenue.daily || []).slice(-7);
      labels = daily.map((d) => d.date);
      values = daily.map((d) => d.total);
    } else if (range === "30d") {
      const daily = (revenue.daily || []).slice(-30);
      labels = daily.map((d) => d.date);
      values = daily.map((d) => d.total);
    } else if (range === "90d") {
      // monthly buckets for 90d view
      const monthly = (revenue.monthly || []).slice(-3);
      labels = monthly.map((m) => m.period);
      values = monthly.map((m) => m.total);
      forecastValues = (revenue.forecast || []).map((f) => f.total);
      labels = [...labels, ...revenue.forecast.map((f) => f.period)];
      values = [...values, ...forecastValues];
    } else {
      const monthly = (revenue.monthly || []).slice(-12);
      labels = monthly.map((m) => m.period);
      values = monthly.map((m) => m.total);
    }

    const comparison = revenue.comparison || {};
    return { labels, values, forecastValues, prevValues: [] };
  }, [revenue, range]);

  const totalRevenue = values.reduce((s, v) => s + v, 0);
  const comparison = revenue.comparison || {};
  const byPlan = (revenue.byPlan || []).slice(0, 6);

const datasets = [
    {
      label: range === "90d" ? t("superadminDashboard.revenue.revenueForecast") : t("superadminDashboard.revenue.revenue"),
      data: values,
      color: "#3B82F6",
    },
  ];

  if (range === "90d" && forecastValues.length) {
    datasets.push({
      label: t("superadminDashboard.revenue.forecast"),
      data: values.map((v, i) => (i >= values.length - forecastValues.length ? v : null)),
      color: "#F59E0B",
      borderDash: [6, 4],
    });
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {CHART_TYPES.map((ct) => (
            <CButton
              key={ct.value}
              onClick={() => setChartType(ct.value)}
              variant={chartType === ct.value ? "primary" : "outline"}
              size="sm"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                chartType === ct.value
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {t(ct.labelKey)}
            </CButton>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <CButton
              key={r.value}
              onClick={() => setRange(r.value)}
              variant={range === r.value ? "primary" : "outline"}
              size="sm"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                range === r.value
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {r.label}
            </CButton>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.revenue.periodTotal")}</p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{formatMoney(totalRevenue)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.revenue.mrr")}</p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{formatMoney(data?.advancedMetrics?.mrr)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.revenue.arr")}</p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{formatMoney(data?.advancedMetrics?.arr)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.revenue.yoyGrowth")}</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
            {comparison.growth || 0}%
            <TrendBadge value={comparison.growth || 0} />
          </p>
        </div>
      </div>

      {/* Main chart */}
      <div className="h-64">
        {chartType === "bar" ? (
          <BarChart labels={labels} datasets={datasets} height={256} loading={loading} />
        ) : (
          <AreaChart labels={labels} datasets={datasets} height={256} loading={loading} />
        )}
      </div>

      {/* Revenue by plan */}
      {byPlan.length > 0 && (
        <div>
<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("superadminDashboard.revenue.byPlan")}
          </p>
          <div className="space-y-2">
            {byPlan.map((p) => {
              const max = Math.max(...byPlan.map((x) => x.total), 1);
              return (
                <div key={String(p.planId)} className="flex items-center gap-3">
                  <span className="w-28 truncate text-sm text-gray-700 dark:text-gray-300">{p.planName}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${(p.total / max) * 100}%` }} />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCompact(p.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueAnalyticsWidget;
