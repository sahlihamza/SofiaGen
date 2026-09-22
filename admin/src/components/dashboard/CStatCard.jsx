import React from "react";

const StatCard = ({
  title,
  value,
  icon,
  change,
  changeLabel,
  trend = "neutral",
  loading = false,
  className = "",
  valueClassName = "",
  titleClassName = "",
}) => {
  const trendClasses = {
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-red-600 dark:text-red-400",
    neutral: "text-gray-500 dark:text-gray-400",
  };

  return (
    <div className={["rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800", className].filter(Boolean).join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={["text-sm font-medium text-gray-500 dark:text-gray-400", titleClassName].filter(Boolean).join(" ")}>
            {title}
          </p>
          {loading ? (
            <div className="mt-3 h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className={["mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100", valueClassName].filter(Boolean).join(" ")}>
              {value}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && !loading && (
        <div className={["mt-4 text-sm", trendClasses[trend] || trendClasses.neutral].filter(Boolean).join(" ")}>
          <span className="font-semibold">{change}</span>
          {changeLabel ? ` ${changeLabel}` : ""}
        </div>
      )}
    </div>
  );
};

export default StatCard;
