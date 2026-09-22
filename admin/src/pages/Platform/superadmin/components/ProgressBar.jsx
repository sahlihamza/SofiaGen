import React from "react";

/**
 * ProgressBar
 *
 * Used for CPU, RAM, disk, storage, and usage metrics.
 * `level` (ok | warning | critical) controls the color.
 */
const ProgressBar = ({
  value = 0,
  max = 100,
  label = "",
  showLabel = true,
  showValue = true,
  size = "md",
  level = "ok",
  className = "",
}) => {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;

  const levelColors = {
    ok: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
    info: "bg-blue-500",
  };

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || showValue) && (
        <div className="mb-1 flex items-center justify-between text-xs">
          {showLabel && <span className="font-medium text-gray-600 dark:text-gray-400">{label}</span>}
          {showValue && (
            <span className="text-gray-500 dark:text-gray-400">
              {value} / {max} ({pct}%)
            </span>
          )}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all ${levelColors[level] || levelColors.ok}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
