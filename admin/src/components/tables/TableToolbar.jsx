import React from "react";
import { FiSearch, FiSliders } from "react-icons/fi";
import { CButton } from "@/components/ui";

/** A shared toolbar for data tables: search, optional filters and bulk actions. */
const TableToolbar = ({
  search = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = null,
  actions = null,
  selectedCount = 0,
  onClearSelection,
  className = "",
}) => (
  <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
    <div className="flex flex-1 flex-wrap items-center gap-2">
      {onSearchChange && (
        <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
      )}
      {filters && <div className="flex flex-wrap items-center gap-2"><FiSliders className="h-4 w-4 text-gray-400" />{filters}</div>}
    </div>
    {(actions || selectedCount > 0) && (
      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 && (
          <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            {selectedCount} selected
            {onClearSelection && <CButton iconOnly icon="x" size="sm" variant="ghost" aria-label="Clear selection" onClick={onClearSelection} />}
          </span>
        )}
        {actions}
      </div>
    )}
  </div>
);

export default TableToolbar;
