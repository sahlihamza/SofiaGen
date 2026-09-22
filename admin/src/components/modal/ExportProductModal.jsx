import { Modal, ModalBody, Select } from "@windmill/react-ui";

import React from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiDownload,
  FiX,
} from "react-icons/fi";
import { IconButton, SecondaryButton } from "@sofia/ui";

//internal import
import useAsync from "@/hooks/useAsync";
import CategoryServices from "@/services/CategoryServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import {
import { Button } from "@sofia/ui";
  EXPORT_COLUMNS,
  EXPORT_COLUMN_GROUPS,
  PRODUCT_TYPE_OPTIONS,
  formatBytes,
} from "@/utils/productExport";
import { Button } from "@sofia/ui";

// The product export window. All state lives in useProductExport; this only
// renders the current phase of it. Steps map to the phases: `config` is the
// WooCommerce-style settings screen, `generating` shows the progress bar,
// `done` the download summary, `error` a retry.
const ExportProductModal = ({ exporter }) => {
  const {
    isOpen,
    close,
    phase,
    selectedCount,
    exportSelectedOnly,
    setExportSelectedOnly,
    selectedColumns,
    toggleColumn,
    selectAllColumns,
    deselectAllColumns,
    filterCategory,
    setFilterCategory,
    filterType,
    setFilterType,
    format,
    setFormat,
    runExport,
    retry,
    progress,
    result,
    errorMessage,
    rowErrors,
    willExportAll,
  } = exporter;

  const { data: categories } = useAsync(CategoryServices.getAllCategories);
  const { showingTranslateValue } = useUtilsFunction();

  if (!isOpen) return null;

  const columnCount = selectedColumns.size;
  const noColumns = columnCount === 0;
  const filtersLocked = exportSelectedOnly && selectedCount > 0;

  const categoryName = filterCategory
    ? showingTranslateValue(
        categories?.find((c) => c._id === filterCategory)?.name
      ) || "â€”"

    : "All categories";
  const typeLabel =
    PRODUCT_TYPE_OPTIONS.find((t) => t.value === filterType)?.label ||
    "All types";

  const percent = progress.total
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      className="w-full overflow-hidden bg-white rounded-lg dark:bg-gray-800 sm:m-4 !max-w-3xl"
      style={{ maxWidth: 860 }}
    >
      <ModalBody className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              Export products
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {selectedCount > 0
                ? `${selectedCount} product(s) selected`
                : "No product selected â€” all products matching the filters will be exported"}
            </p>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            iconOnly
            onClick={close}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
          >
            <FiX size={20} />
          </IconButton>
        </div>

        {/* ---- Config phase ------------------------------------------------ */}
        {phase === "config" && (
          <>
            <div className="px-6 py-4 space-y-6 max-h-[65vh] overflow-y-auto">
              {/* Scope */}
              <section>
                <label
                  className={`flex items-start gap-3 p-3 rounded-md border ${
                    selectedCount > 0
                      ? "border-gray-200 dark:border-gray-600 cursor-pointer"
                      : "border-gray-100 dark:border-gray-700 opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    disabled={selectedCount === 0}
                    checked={exportSelectedOnly && selectedCount > 0}
                    onChange={(e) => setExportSelectedOnly(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Export only the selected products
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {selectedCount > 0
                        ? `${selectedCount} product(s) currently selected in the table.`
                        : "Select rows in the table to enable this."}
                    </span>
                  </span>
                </label>
              </section>

              {/* Columns */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Columns to export
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      {columnCount}/{EXPORT_COLUMNS.length} selected
                    </span>
                  </h4>
                  <div className="flex gap-3 text-xs">
                    <SecondaryButton
                      variant="ghost"
                      size="sm"
                      onClick={selectAllColumns}
                      className="text-emerald-600 hover:underline focus:outline-none"
                    >
                      Select all
                    </SecondaryButton>
                    <SecondaryButton
                      variant="ghost"
                      size="sm"
                      onClick={deselectAllColumns}
                      className="text-gray-500 hover:underline focus:outline-none dark:text-gray-400"
                    >
                      Deselect all
                    </SecondaryButton>
                  </div>
                </div>

                {noColumns && (
                  <div className="flex items-center gap-2 p-2 mb-3 text-xs text-red-600 rounded-md bg-red-50 dark:bg-gray-700">
                    <FiAlertCircle className="shrink-0" />
                    Pick at least one column to enable the export.
                  </div>
                )}

                <div className="space-y-4">
                  {EXPORT_COLUMN_GROUPS.map(({ group, columns }) => (
                    <div key={group}>
                      <p className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                        {group}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                        {columns.map((col) => (
                          <label
                            key={col.key}
                            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer dark:text-gray-300"
                          >
                            <input
                              type="checkbox"
                              checked={selectedColumns.has(col.key)}
                              onChange={() => toggleColumn(col.key)}
                            />
                            {col.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Filters + format */}
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                    Category
                  </label>
                  <Select
                    className="h-10 text-sm"
                    disabled={filtersLocked}
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {categories?.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {showingTranslateValue(cat?.name)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                    Product type
                  </label>
                  <Select
                    className="h-10 text-sm"
                    disabled={filtersLocked}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    {PRODUCT_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                    Format
                  </label>
                  <Select
                    className="h-10 text-sm"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="csv">CSV</option>
                  </Select>
                </div>
                {filtersLocked && (
                  <p className="text-xs text-gray-400 sm:col-span-3 dark:text-gray-500">
                    Category and type filters apply when exporting all products;
                    they are ignored while â€œselected products onlyâ€ is on.

                  </p>
                )}
              </section>

              {/* Summary */}
              <section className="p-3 text-sm rounded-md bg-gray-50 dark:bg-gray-700">
                <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                  Summary
                </p>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li>
                    Scope:{" "}
                    <span className="font-medium">
                      {willExportAll
                        ? "All products matching the filters"
                        : `${selectedCount} selected product(s)`}
                    </span>
                  </li>
                  <li>
                    Columns:{" "}
                    <span className="font-medium">
                      {columnCount} of {EXPORT_COLUMNS.length}
                    </span>
                  </li>
                  {willExportAll && (
                    <>
                      <li>
                        Category:{" "}
                        <span className="font-medium">{categoryName}</span>
                      </li>
                      <li>
                        Type: <span className="font-medium">{typeLabel}</span>
                      </li>
                    </>
                  )}
                  <li>
                    Format:{" "}
                    <span className="font-medium uppercase">{format}</span>
                  </li>
                </ul>
              </section>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <Button layout="outline" onClick={close}>
                Cancel
              </Button>
              <Button onClick={runExport} disabled={noColumns}>
                <FiDownload className="mr-2" /> Export
              </Button>
            </div>
          </>
        )}

        {/* ---- Generating phase ------------------------------------------- */}
        {phase === "generating" && (
          <div className="px-6 py-10">
            <p className="mb-3 text-sm text-center text-gray-600 dark:text-gray-300">
              Generating the CSV fileâ€¦

            </p>
            <div className="w-full h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full transition-all duration-150 bg-emerald-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400">
              {progress.processed} of {progress.total} products processed
              {progress.total
                ? ` â€” ${Math.max(progress.total - progress.processed, 0)} remaining`

                : ""}{" "}
              ({percent}%)
            </p>
          </div>
        )}

        {/* ---- Done phase ------------------------------------------------- */}
        {phase === "done" && result && (
          <>
            <div className="px-6 py-8 text-center">
              <FiCheckCircle className="mx-auto text-emerald-500" size={44} />
              <h4 className="mt-3 text-base font-semibold text-gray-700 dark:text-gray-200">
                Export completed
              </h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {result.count} product(s) exported Â· {formatBytes(result.size)}

              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 break-all">
                {result.fileName}
              </p>

              {rowErrors.length > 0 && (
                <div className="mt-4 text-left">
                  <div className="flex items-start gap-2 p-3 text-xs text-amber-700 rounded-md bg-amber-50 dark:bg-gray-700 dark:text-amber-300">
                    <FiAlertTriangle className="mt-0.5 shrink-0" />
                    <div>
                      {rowErrors.length} product(s) could not be written and were
                      skipped:
                      <ul className="mt-1 space-y-0.5 list-disc list-inside">
                        {rowErrors.slice(0, 8).map((r, i) => (
                          <li key={i}>
                            {r.name} â€” {r.message}
                          </li>
                        ))}
                        {rowErrors.length > 8 && (
                          <li>â€¦and {rowErrors.length - 8} more</li>

                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <Button onClick={close}>Close</Button>
            </div>
          </>
        )}

        {/* ---- Error phase ------------------------------------------------ */}
        {phase === "error" && (
          <>
            <div className="px-6 py-8 text-center">
              <FiAlertCircle className="mx-auto text-red-500" size={44} />
              <h4 className="mt-3 text-base font-semibold text-gray-700 dark:text-gray-200">
                Export failed
              </h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {errorMessage}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <Button layout="outline" onClick={close}>
                Cancel
              </Button>
              <Button onClick={retry}>Try again</Button>
            </div>
          </>
        )}
      </ModalBody>
    </Modal>
  );
};

export default ExportProductModal;
