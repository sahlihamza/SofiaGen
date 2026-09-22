import React from "react";

const FilterBar = ({
  children,
  className = "",
  actions = null,
  title = null,
  description = null,
  compact = false,
}) => {
  return (
    <div className={["rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800", compact ? "p-2" : "p-3 sm:p-4", className].filter(Boolean).join(" ")}>
      {(title || description || actions) && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}
            {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        {children}
      </div>
    </div>
  );
};

export default FilterBar;
