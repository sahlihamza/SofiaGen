import React from "react";

const KpiCard = ({ label, value, change, tone = "emerald", icon: Icon, subtitle }) => {
  const toneStyles = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        {Icon && (
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[tone] || toneStyles.emerald}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      {change && (
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{change}</span>
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
      {!change && subtitle && <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
    </div>
  );
};

export default KpiCard;
