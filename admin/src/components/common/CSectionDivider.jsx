import React from "react";

const CSectionDivider = ({ className = "", label }) => {
  return (
    <div className={["flex items-center gap-3 py-2", className].filter(Boolean).join(" ")}>
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      {label && <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>}
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
    </div>
  );
};

export default CSectionDivider;
