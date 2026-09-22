import React from "react";
import "chart.js/auto";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { WidgetContent } from "./WidgetStates";

/**
 * Reusable Chart.js wrappers with dark-mode aware defaults.
 */

const chartDefaults = (isDark) => ({
  gridColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
  tickColor: isDark ? "#9CA3AF" : "#6B7280",
  borderColor: isDark ? "#374151" : "#E5E7EB",
});

const baseOptions = (isDark, extra = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: {
      labels: { color: isDark ? "#D1D5DB" : "#374151", usePointStyle: true, boxWidth: 8 },
    },
    tooltip: {
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      titleColor: isDark ? "#F3F4F6" : "#111827",
      bodyColor: isDark ? "#D1D5DB" : "#374151",
      borderColor: isDark ? "#374151" : "#E5E7EB",
      borderWidth: 1,
      padding: 12,
    },
  },
  ...extra,
});

/**
 * LineChart — smooth trend line(s)
 */
export const LineChart = ({
  labels = [],
  datasets = [],
  height = 280,
  loading = false,
  error = null,
  isEmpty = false,
  ...rest
}) => {
  const isDark = document.documentElement.classList.contains("dark");
  const d = chartDefaults(isDark);
  const data = {
    labels,
    datasets: datasets.map((ds, i) => ({
      fill: false,
      tension: 0.4,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderColor: ds.color || ["#3B82F6", "#10B981", "#F97316", "#8B5CF6"][i % 4],
      backgroundColor: ds.color || ["#3B82F6", "#10B981", "#F97316", "#8B5CF6"][i % 4],
      ...ds,
    })),
  };
  const options = baseOptions(isDark, {
    scales: {
      x: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, maxTicksLimit: 8 } },
      y: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, maxTicksLimit: 6 } },
    },
  });

  return (
    <WidgetContent loading={loading} error={error} isEmpty={isEmpty} {...rest}>
      <div style={{ height }}>
        <Line data={data} options={options} />
      </div>
    </WidgetContent>
  );
};

/**
 * BarChart — grouped/stacked bars
 */
export const BarChart = ({
  labels = [],
  datasets = [],
  height = 280,
  stacked = false,
  horizontal = false,
  loading = false,
  error = null,
  isEmpty = false,
  ...rest
}) => {
  const isDark = document.documentElement.classList.contains("dark");
  const d = chartDefaults(isDark);
  const data = {
    labels,
    datasets: datasets.map((ds, i) => ({
      borderRadius: 6,
      borderSkipped: false,
      backgroundColor: ds.color || ["#3B82F6", "#10B981", "#F97316", "#8B5CF6", "#EC4899"][i % 5],
      ...ds,
    })),
  };
  const options = baseOptions(isDark, {
    scales: {
      x: {
        grid: { color: d.gridColor },
        ticks: { color: d.tickColor, maxTicksLimit: 10 },
        stacked,
      },
      y: {
        grid: { color: d.gridColor },
        ticks: { color: d.tickColor, maxTicksLimit: 6 },
        stacked,
      },
    },
    indexAxis: horizontal ? "y" : "x",
  });

  return (
    <WidgetContent loading={loading} error={error} isEmpty={isEmpty} {...rest}>
      <div style={{ height }}>
        <Bar data={data} options={options} />
      </div>
    </WidgetContent>
  );
};

/**
 * DoughnutChart — distribution breakdown
 */
export const DoughnutChart = ({
  labels = [],
  values = [],
  colors = ["#3B82F6", "#10B981", "#F97316", "#8B5CF6", "#EC4899", "#06B6D4", "#F59E0B", "#64748B"],
  height = 260,
  cutout = "65%",
  loading = false,
  error = null,
  isEmpty = false,
  centerLabel = null,
  ...rest
}) => {
  const isDark = document.documentElement.classList.contains("dark");
  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors.slice(0, Math.max(values.length, 1)),
        borderWidth: 2,
        borderColor: isDark ? "#1F2937" : "#FFFFFF",
      },
    ],
  };
  const options = baseOptions(isDark, {
    cutout,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: isDark ? "#D1D5DB" : "#374151", boxWidth: 10, padding: 12 },
      },
    },
  });

  return (
    <WidgetContent loading={loading} error={error} isEmpty={isEmpty} {...rest}>
      <div className="relative" style={{ height }}>
        <Doughnut data={data} options={options} />
        {centerLabel && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{centerLabel.value}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{centerLabel.label}</span>
          </div>
        )}
      </div>
    </WidgetContent>
  );
};

/**
 * AreaChart — filled line (revenue trend)
 */
export const AreaChart = ({
  labels = [],
  datasets = [],
  height = 280,
  loading = false,
  error = null,
  isEmpty = false,
  ...rest
}) => {
  const isDark = document.documentElement.classList.contains("dark");
  const d = chartDefaults(isDark);
  const data = {
    labels,
    datasets: datasets.map((ds, i) => ({
      fill: true,
      tension: 0.4,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderColor: ds.color || ["#3B82F6", "#10B981", "#F97316", "#8B5CF6"][i % 4],
      backgroundColor: ds.color
        ? `${ds.color}33`
        : ["#3B82F6", "#10B981", "#F97316", "#8B5CF6"][i % 4] + "33",
      ...ds,
    })),
  };
  const options = baseOptions(isDark, {
    scales: {
      x: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, maxTicksLimit: 8 } },
      y: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, maxTicksLimit: 6 } },
    },
  });

  return (
    <WidgetContent loading={loading} error={error} isEmpty={isEmpty} {...rest}>
      <div style={{ height }}>
        <Line data={data} options={options} />
      </div>
    </WidgetContent>
  );
};
