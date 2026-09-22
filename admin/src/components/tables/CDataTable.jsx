import React from "react";

const DataTable = ({
  columns = [],
  rows = [],
  getRowKey = (row, index) => index,
  emptyState = null,
  className = "",
  tableClassName = "",
  headClassName = "",
  bodyClassName = "",
  rowClassName = "",
  cellClassName = "",
  loading = false,
  loadingRows = 5,
  ariaLabel = "Data table",
  renderCell,
}) => {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className={["min-w-full divide-y divide-gray-200 dark:divide-gray-700", tableClassName].filter(Boolean).join(" ")}>
            <thead className={headClassName}>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key || index}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={bodyClassName}>
              {Array.from({ length: loadingRows }).map((_, index) => (
                <tr key={index} className={rowClassName}>
                  {columns.map((column, columnIndex) => (
                    <td key={`${index}-${columnIndex}`} className={["px-4 py-3", cellClassName].filter(Boolean).join(" ")}>
                      <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {emptyState || (
          <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            No data available.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={["overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800", className].filter(Boolean).join(" ")}>
      <div className="overflow-x-auto">
        <table className={["min-w-full divide-y divide-gray-200 dark:divide-gray-700", tableClassName].filter(Boolean).join(" ")} aria-label={ariaLabel}>
          <thead className={headClassName}>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key || index}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={bodyClassName}>
            {rows.map((row, rowIndex) => {
              const rowKey = getRowKey(row, rowIndex);
              return (
                <tr key={rowKey} className={["border-t border-gray-100 align-top dark:border-gray-700", rowClassName].filter(Boolean).join(" ")}>
                  {columns.map((column, columnIndex) => (
                    <td key={`${rowKey}-${column.key || columnIndex}`} className={["px-4 py-3 text-sm text-gray-700 dark:text-gray-300", cellClassName].filter(Boolean).join(" ")}>
                      {renderCell ? renderCell({ row, column, value: row[column.key], rowIndex }) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
