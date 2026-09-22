import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";

import { Pagination } from "@windmill/react-ui";
import {
  FiChevronDown,
  FiSearch,
  FiDownload,
  FiX,
  FiArrowUp,
  FiArrowDown,
  FiCheck,
} from "react-icons/fi";
import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";
import { Button } from "@sofia/ui";

const SortableDataTable = ({
  // Core props
  columns = [],
  rows = [],
  getRowKey = (row, index) => row._id || row.id || index,
  emptyState = null,
  className = "",
  tableClassName = "",
  headClassName = "",
  bodyClassName = "",
  rowClassName = "",
  cellClassName = "",
  loading = false,
  loadingRows = 5,
  ariaLabel = "Sortable data table",

  // Cell rendering
  renderCell,
  onRowClick,
  onRowDoubleClick,
  onRowHover,
  footerClassName = "",

  // Sorting
  sortColumn,
  sortDirection,
  onSort,
  multiSort = false,
  sortStates = [],
  defaultSort = null,
  defaultSortDirection = "asc",

  // Column visibility
  visibleColumns,
  onVisibleColumnsChange,
  columnSelectorLabel = "Columns",
  columnOrder = null,
  onColumnOrderChange = null,
  resizableColumns = false,
  onColumnResize = null,
  pinnedColumns = null,
  defaultVisibleColumns = null,

  // Search & filter
  globalSearch = false,
  globalSearchPlaceholder = "Search...",
  columnFilters = null,
  onColumnFilterChange = null,
  defaultColumnFilters = null,

  // Pagination
  pagination,
  pageSizeOptions = null,
  defaultPageSize = null,
  onPageSizeChange = null,
  showJumpToPage = false,
  infiniteScroll = false,
  onLoadMore = null,
  hasMore = false,

  // Selection
  rowSelection = false,
  selectionMode = "multi",
  selectedRowKeys = null,
  onSelectionChange = null,
  getRowCheckboxProps = null,
  selectionActions = null,
  showSelectAll = true,
  defaultSelectedRowKeys = null,

  // Display & density
  density = "normal",
  stickyHeader = false,
  stripedRows = false,
  bordered = true,
  borderless = false,
  maxHeight = null,
  minHeight = null,

  // Row actions
  expandableRows = false,
  renderExpandedRow = null,
  isRowExpanded = null,
  onRowExpand = null,
  dragToReorder = false,
  onRowReorder = null,

  // Grouping & aggregation
  groupBy = null,
  aggregations = null,
  summaryRow = null,
  onGroupChange = null,

  // Export
  exportOptions = null,
  exportFilename = "export",
  exportColumns = null,
  onExport = null,

  // Theming
  theme = "auto",

  // Persistence
  persistence = null,
  persistenceKey = "tableState",
  urlSync = false,
  onStateChange = null,

  // Toolbar
  toolbar = null,
  showToolbar = false,

  // Tooltip
  tooltips = false,
  tooltipTruncate = 30,

  // Copy
  copyOnClick = false,
  onCopy = null,

  // Keyboard navigation
  keyboardNavigation = false,
  onFocusedRowChange = null,

  // Virtualization
  virtualized = false,
  estimatedRowHeight = 40,

  // Sort UI
  sortOptions = [],
  onSortChange = null,

  // i18n
  locale = null,

  // Empty/Loading custom
  loadingComponent = null,

  // Server/client pagination mode
  paginationMode = "server",
}) => {
  // ======================== STATE ========================
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [globalSearchValue, setGlobalSearchValue] = useState("");
  const [internalColumnFilters, setInternalColumnFilters] = useState(defaultColumnFilters || {});
  const [internalSelectedKeys, setInternalSelectedKeys] = useState(defaultSelectedRowKeys || []);
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize || (pagination && pagination.limit) || DEFAULT_PAGE_SIZE);
  const [jumpToPageValue, setJumpToPageValue] = useState("");
  const [columnWidths, setColumnWidths] = useState({});
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState({});
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);

  const columnSelectorRef = useRef(null);
  const exportRef = useRef(null);
  const tableContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // ======================== SORTING ========================
  const effectiveSortColumn = sortColumn !== undefined ? sortColumn : defaultSort;
  const effectiveSortDirection = sortDirection !== undefined ? sortDirection : defaultSortDirection;

  const handleHeaderSort = useCallback((columnKey) => {
    if (!onSort) return;

    if (multiSort) {
      const existing = sortStates.find((s) => s.field === columnKey);
      let newStates;
      if (!existing) {
        newStates = [...sortStates, { field: columnKey, direction: "asc" }];
      } else if (existing.direction === "asc") {
        newStates = sortStates.map((s) => (s.field === columnKey ? { ...s, direction: "desc" } : s));
      } else {
        newStates = sortStates.filter((s) => s.field !== columnKey);
      }
      if (onSortChange) {
        onSortChange({ field: columnKey, direction: existing && existing.direction === "asc" ? "desc" : "asc", states: newStates });
      } else {
        onSort(columnKey);
      }
    } else {
      onSort(columnKey);
    }
  }, [multiSort, sortStates, onSort, onSortChange]);

  // ======================== COLUMNS ========================
  const orderedColumns = useMemo(() => {
    if (!columnOrder) return columns;
    const colMap = new Map(columns.map((c) => [c.key, c]));
    return columnOrder.map((key) => colMap.get(key)).filter(Boolean);
  }, [columns, columnOrder]);

  const activeColumns = useMemo(() => {
    let cols = orderedColumns;
    if (visibleColumns && onVisibleColumnsChange) {
      cols = cols.filter((col) => visibleColumns.includes(col.key));
    }
    return cols;
  }, [orderedColumns, visibleColumns, onVisibleColumnsChange]);

  // ======================== ROW SELECTION ========================
  const effectiveSelectedKeys = selectedRowKeys !== null ? selectedRowKeys : internalSelectedKeys;
  const isRowSelected = useCallback((rowKey) => {
    if (selectionMode === "single") return effectiveSelectedKeys === rowKey;
    return Array.isArray(effectiveSelectedKeys) && effectiveSelectedKeys.includes(rowKey);
  }, [effectiveSelectedKeys, selectionMode]);

  const handleSelectRow = useCallback((rowKey, checked) => {
    if (!onSelectionChange) return;
    if (selectionMode === "single") {
      onSelectionChange(checked ? rowKey : null);
      return;
    }
    let newKeys;
    if (checked) {
      newKeys = [...(Array.isArray(effectiveSelectedKeys) ? effectiveSelectedKeys : []), rowKey];
    } else {
      newKeys = (Array.isArray(effectiveSelectedKeys) ? effectiveSelectedKeys : []).filter((k) => k !== rowKey);
    }
    onSelectionChange(newKeys);
  }, [effectiveSelectedKeys, onSelectionChange, selectionMode]);

  const handleSelectAll = useCallback((checked) => {
    if (!onSelectionChange) return;
    if (!rows.length) return;
    if (checked) {
      const allKeys = rows.map((row, i) => getRowKey(row, i));
      onSelectionChange(allKeys);
    } else {
      onSelectionChange([]);
    }
  }, [rows, getRowKey, onSelectionChange]);

  const allRowsSelected = useMemo(() => {
    if (!rows.length) return false;
    return rows.every((row, i) => isRowSelected(getRowKey(row, i)));
  }, [rows, isRowSelected, getRowKey]);

  const someRowsSelected = useMemo(() => {
    if (!rows.length) return false;
    return rows.some((row, i) => isRowSelected(getRowKey(row, i)));
  }, [rows, isRowSelected, getRowKey]);

  // ======================== GLOBAL SEARCH & FILTER ========================
  const filteredRows = useMemo(() => {
    let result = rows;
    if (globalSearch && globalSearchValue) {
      const search = String(globalSearchValue).toLowerCase();
      result = result.filter((row) => {
        return activeColumns.some((col) => {
          if (col.searchable === false) return false;
          const value = col.accessor ? col.accessor(row) : row[col.key];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(search);
        });
      });
    }
    const activeFilters = columnFilters || internalColumnFilters;
    const filterKeys = Object.keys(activeFilters || {});
    if (filterKeys.length > 0) {
      result = result.filter((row) => {
        return filterKeys.every((key) => {
          const filterValue = activeFilters[key];
          if (filterValue === "" || filterValue === null || filterValue === undefined) return true;
          const col = activeColumns.find((c) => c.key === key);
          if (col && col.filterFn) {
            return col.filterFn(row, filterValue);
          }
          const cellValue = col && col.accessor ? col.accessor(row) : row[key];
          if (cellValue === null || cellValue === undefined) return false;
          return String(cellValue).toLowerCase().includes(String(filterValue).toLowerCase());
        });
      });
    }
    return result;
  }, [rows, globalSearch, globalSearchValue, activeColumns, columnFilters, internalColumnFilters]);

  // ======================== COLUMN VISIBILITY ========================
  const handleToggleColumn = (key) => {
    if (!onVisibleColumnsChange) return;
    if (visibleColumns.includes(key)) {
      if (visibleColumns.length > 1) {
        onVisibleColumnsChange(visibleColumns.filter((k) => k !== key));
      }
    } else {
      onVisibleColumnsChange([...visibleColumns, key]);
    }
  };

  // ======================== COLUMN ORDER (drag & drop) ========================
  const handleColumnDragStart = (e, key) => {
    if (!onColumnOrderChange) return;
    setDraggedColumn(key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDragOver = (e) => {
    if (!onColumnOrderChange) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleColumnDrop = (e, targetKey) => {
    if (!onColumnOrderChange || !draggedColumn || draggedColumn === targetKey) return;
    const currentOrder = columnOrder || orderedColumns.map((c) => c.key);
    const fromIndex = currentOrder.indexOf(draggedColumn);
    const toIndex = currentOrder.indexOf(targetKey);
    if (fromIndex < 0 || toIndex < 0) return;
    const newOrder = [...currentOrder];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedColumn);
    onColumnOrderChange(newOrder);
    setDraggedColumn(null);
  };

  // ======================== COLUMN RESIZE ========================
  const handleResizeStart = (e, columnKey) => {
    if (!resizableColumns) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = e.currentTarget.parentElement.offsetWidth;
    const onMove = (ev) => {
      const newWidth = startWidth + (ev.clientX - startX);
      setColumnWidths((prev) => ({ ...prev, [columnKey]: Math.max(50, newWidth) }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ======================== ROW EXPAND ========================
  const handleRowExpand = (rowKey) => {
    if (!expandableRows) return;
    setExpandedRowKeys((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
    if (onRowExpand) onRowExpand(rowKey, !expandedRowKeys[rowKey]);
  };

  const isExpanded = (rowKey) => {
    if (isRowExpanded) return isRowExpanded(rowKey);
    return !!expandedRowKeys[rowKey];
  };

  // ======================== DENSITY CLASSES ========================
  const densityClasses = {
    compact: "px-2 py-1.5 text-xs",
    normal: "px-4 py-3 text-sm",
    comfortable: "px-6 py-4 text-base",
  };
  const cellClass = densityClasses[density] || densityClasses.normal;

  // ======================== CLICK OUTSIDE ========================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target)) {
        setIsColumnSelectorOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ======================== URL SYNC ========================
  useEffect(() => {
    if (!urlSync) return;
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    if (page && pagination && pagination.onChange) pagination.onChange(Number(page));
  }, []);

  // ======================== PERSISTENCE ========================
  useEffect(() => {
    if (!persistence) return;
    try {
      const storage = persistence === "localStorage" ? window.localStorage : window.sessionStorage;
      const saved = storage.getItem(persistenceKey);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.visibleColumns && onVisibleColumnsChange) onVisibleColumnsChange(state.visibleColumns);
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  // ======================== KEYBOARD NAVIGATION ========================
  useEffect(() => {
    if (!keyboardNavigation) return;
    const handler = (e) => {
      if (!tableContainerRef.current || !tableContainerRef.current.contains(document.activeElement)) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedRowIndex((i) => {
          const next = Math.min(i + 1, filteredRows.length - 1);
          if (onFocusedRowChange) onFocusedRowChange(next);
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedRowIndex((i) => {
          const next = Math.max(i - 1, 0);
          if (onFocusedRowChange) onFocusedRowChange(next);
          return next;
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        setFocusedRowIndex(0);
        if (onFocusedRowChange) onFocusedRowChange(0);
      } else if (e.key === "End") {
        e.preventDefault();
        const last = filteredRows.length - 1;
        setFocusedRowIndex(last);
        if (onFocusedRowChange) onFocusedRowChange(last);
      } else if (e.key === "Escape") {
        setFocusedRowIndex(-1);
      } else if (e.key === "Enter" && focusedRowIndex >= 0 && onRowClick) {
        onRowClick(filteredRows[focusedRowIndex]);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [keyboardNavigation, filteredRows, focusedRowIndex, onRowClick, onFocusedRowChange]);

  // ======================== COPY ON CLICK ========================
  const handleCellCopy = useCallback((value) => {
    if (!copyOnClick) return;
    const text = value === null || value === undefined ? "" : String(value);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => { /* ignore */ });
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
    }
    if (onCopy) onCopy(value);
  }, [copyOnClick, onCopy]);

  // ======================== EXPORT ========================
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format) => {
    if (onExport) {
      onExport(format, filteredRows, activeColumns);
      setIsExportOpen(false);
      return;
    }
    const cols = exportColumns || activeColumns.filter((c) => c.key !== "__select" && c.key !== "__expand");
    const dataToExport = filteredRows.map((row) => {
      const obj = {};
      cols.forEach((col) => {
        const val = col.accessor ? col.accessor(row) : row[col.key];
        obj[col.exportLabel || col.header || col.key] = val === null || val === undefined ? "" : val;
      });
      return obj;
    });

    if (format === "csv") {
      const headers = Object.keys(dataToExport[0] || {});
      const csv = [
        headers.join(","),
        ...dataToExport.map((row) =>
          headers.map((h) => {
            const v = row[h];
            const s = v === null || v === undefined ? "" : String(v);
            return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(",")
        ),
      ].join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv" }), `${exportFilename}.csv`);
    } else if (format === "json") {
      downloadBlob(new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" }), `${exportFilename}.json`);
    } else if (format === "excel") {
      const headers = Object.keys(dataToExport[0] || {});
      const tab = dataToExport.map((row) => headers.map((h) => row[h] !== undefined ? row[h] : "").join("\t")).join("\n");
      downloadBlob(new Blob([`${headers.join("\t")}\n${tab}`], { type: "application/vnd.ms-excel" }), `${exportFilename}.xls`);
    } else if (format === "print" || format === "pdf") {
      const headers = Object.keys(dataToExport[0] || {});
      const html = `
        <html><head><title>${exportFilename}</title>
        <style>body{font-family:Arial;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
        </head><body>
        <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${dataToExport.map((row) => `<tr>${headers.map((h) => `<td>${row[h] !== undefined ? row[h] : ""}</td>`).join("")}</tr>`).join("")}</tbody></table>
        </body></html>
      `;
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 250);
      }
    }
    setIsExportOpen(false);
  };

  // ======================== PAGINATION ========================
  const hasPagination = pagination && typeof pagination.onChange === "function";
  const currentPageSize = (pagination && pagination.limit) || internalPageSize;
  const totalPages = pagination && pagination.total ? Math.max(1, Math.ceil(pagination.total / currentPageSize)) : 1;
  const currentPage = (pagination && pagination.page) || 1;

  const handlePageSizeChange = (newSize) => {
    setInternalPageSize(newSize);
    if (onPageSizeChange) onPageSizeChange(newSize);
  };

  // ======================== GROUPING ========================
  const groupedRows = useMemo(() => {
    if (!groupBy) return null;
    const groups = {};
    filteredRows.forEach((row) => {
      const key = row[groupBy] !== null && row[groupBy] !== undefined ? row[groupBy] : "_other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }, [filteredRows, groupBy]);

  // ======================== RENDER SORT INDICATOR ========================
  const renderSortIndicator = (columnKey) => {
    const isActive = effectiveSortColumn === columnKey;
    if (multiSort && sortStates.length > 0) {
      const state = sortStates.find((s) => s.field === columnKey);
      if (state) {
        return state.direction === "asc" ? (
          <FiArrowUp className="ml-1 text-emerald-600 dark:text-emerald-400 inline" size={12} />
        ) : (
          <FiArrowDown className="ml-1 text-emerald-600 dark:text-emerald-400 inline" size={12} />
        );
      }
    }
    if (!isActive) {
      return (
        <span className="ml-1 inline-flex flex-col leading-none text-gray-400">
          <svg className="-mb-0.5" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      );
    }
    return effectiveSortDirection === "asc" ? (
      <FiArrowUp className="ml-1 text-emerald-600 dark:text-emerald-400 inline" size={12} />
    ) : (
      <FiArrowDown className="ml-1 text-emerald-600 dark:text-emerald-400 inline" size={12} />
    );
  };

  // ======================== RENDER ROW (helper) ========================
  const renderRow = useCallback((row, rowIndex) => {
    const rowKey = getRowKey(row, rowIndex);
    const resolvedRowClassName = typeof rowClassName === "function" ? rowClassName({ row, rowIndex }) : rowClassName;
    const isSelected = isRowSelected(rowKey);
    const isFocused = focusedRowIndex === rowIndex;
    const rowExpanded = isExpanded(rowKey);
    return (
      <React.Fragment key={rowKey}>
        <tr
          className={[
            "border-t border-gray-100 align-top dark:border-gray-700 transition-colors",
            onRowClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" : "",
            stripedRows && rowIndex % 2 === 1 ? "bg-gray-50/50 dark:bg-gray-800/50" : "",
            isSelected ? "bg-emerald-50/70 dark:bg-emerald-900/10" : "",
            isFocused ? "ring-2 ring-emerald-400 ring-inset" : "",
            resolvedRowClassName,
          ].filter(Boolean).join(" ")}
          onClick={onRowClick ? (e) => {
            const target = e.target;
            const isInteractive = target.closest("button, a, input, select, textarea, [role=\"button\"], [role=\"link\"], [data-no-row-click]");
            if (!isInteractive) onRowClick(row);
          } : undefined}
          onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
          onMouseEnter={onRowHover ? () => onRowHover(row) : undefined}
        >
          {rowSelection && (
            <td className={["px-4 py-3 w-10", cellClass].join(" ")}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleSelectRow(rowKey, e.target.checked)}
                data-no-row-click
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
            </td>
          )}
          {activeColumns.map((column, columnIndex) => (
            <td
              key={`${rowKey}-${column.key || columnIndex}`}
              className={[
                cellClass,
                "text-gray-700 dark:text-gray-200",
                column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : "",
                pinnedColumns && pinnedColumns.includes(column.key) ? "sticky left-0 bg-white dark:bg-gray-800" : "",
                cellClassName,
              ].filter(Boolean).join(" ")}
              onClick={copyOnClick ? () => handleCellCopy(row[column.key]) : undefined}
              style={{
                width: columnWidths[column.key] ? columnWidths[column.key] : column.width,
                minWidth: column.minWidth || 80,
              }}
            >
              {(() => {
                const renderedCell = renderCell ? renderCell({ row, column, value: row[column.key], rowIndex }) : row[column.key];
                const isObject = renderedCell && typeof renderedCell === "object" && !Array.isArray(renderedCell);
                const hasColumnKey = isObject && Object.prototype.hasOwnProperty.call(renderedCell, column.key);
                let cellContent = hasColumnKey ? renderedCell[column.key] : renderedCell;
                if (expandableRows && columnIndex === 0) {
                  cellContent = (
                    <span className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        onClick={() => handleRowExpand(rowKey)}
                        data-no-row-click
                        className="text-gray-400 hover:text-gray-700"
                        aria-label={rowExpanded ? "Collapse" : "Expand"}
                      >
                        {rowExpanded ? "\u25BE" : "\u25B8"}
                      </Button>
                      {cellContent}
                    </span>
                  );
                }
                if (tooltips && typeof cellContent === "string" && cellContent.length > tooltipTruncate) {
                  return (
                    <span title={cellContent} className="block truncate" style={{ maxWidth: 200 }}>
                      {cellContent}
                    </span>
                  );
                }
                return cellContent;
              })()}
            </td>
          ))}
        </tr>
        {expandableRows && rowExpanded && (
          <tr className="bg-gray-50/50 dark:bg-gray-800/30">
            <td colSpan={activeColumns.length + (rowSelection ? 1 : 0)} className="px-6 py-4">
              {renderExpandedRow ? renderExpandedRow(row) : null}
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  }, [
    getRowKey, rowClassName, isRowSelected, focusedRowIndex, isExpanded,
    onRowClick, onRowDoubleClick, onRowHover, rowSelection, cellClass,
    handleSelectRow, activeColumns, copyOnClick, handleCellCopy, columnWidths,
    expandableRows, handleRowExpand, tooltips, tooltipTruncate, renderCell,
  ]);

  // ======================== RENDER TOOLBAR ========================
  const renderToolbar = () => {
    if (!showToolbar && !globalSearch && !exportOptions) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          {globalSearch && (
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={globalSearchPlaceholder}
                value={globalSearchValue}
                onChange={(e) => setGlobalSearchValue(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {globalSearchValue && (
                <Button
                  type="button"
                  onClick={() => setGlobalSearchValue("")}
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <FiX size={14} />
                </Button>
              )}
            </div>
          )}
          {toolbar && toolbar}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exportOptions && (
            <div className="relative" ref={exportRef}>
              <Button
                type="button"
                onClick={() => setIsExportOpen((p) => !p)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <FiDownload className="h-3.5 w-3.5" />
                Export
                <FiChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </Button>
              {isExportOpen && (
                <div className="absolute right-0 z-20 mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {(() => {
                    const opts = exportOptions === true
                      ? ["csv", "excel", "json", "print", "pdf"]
                      : exportOptions;
                    return opts.map((fmt) => (
                      <Button
                        key={fmt}
                        type="button"
                        onClick={() => handleExport(fmt)}
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 capitalize"
                      >
                        {fmt === "json" ? "JSON" : fmt.toUpperCase()}
                      </Button>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ======================== SELECTION ACTIONS BAR ========================
  const renderSelectionActions = () => {
    if (!rowSelection || !selectionActions) return null;
    const count = selectionMode === "single"
      ? (effectiveSelectedKeys ? 1 : 0)
      : (Array.isArray(effectiveSelectedKeys) ? effectiveSelectedKeys.length : 0);
    if (count === 0) return null;
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-900/20">
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {count} selected
        </span>
        {typeof selectionActions === "function" ? selectionActions(effectiveSelectedKeys) : selectionActions}
      </div>
    );
  };

  // ======================== COMPUTED CLASSES ========================
  const wrapperClasses = [
    "overflow-hidden rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800",
    bordered ? "border-gray-200" : "border-0",
    className,
  ].filter(Boolean).join(" ");

  const tableClasses = [
    "min-w-full divide-y divide-gray-200 dark:divide-gray-700",
    tableClassName,
  ].filter(Boolean).join(" ");

  const theadClasses = [
    stickyHeader ? "sticky top-0 z-20 bg-white dark:bg-gray-800" : "",
    headClassName,
  ].filter(Boolean).join(" ");

  // ======================== RENDER TABLE ========================
  return (
    <div ref={tableContainerRef} className={wrapperClasses}>
      {renderToolbar()}
      {renderSelectionActions()}

      {/* Column selector */}
      {onVisibleColumnsChange && visibleColumns && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative" ref={columnSelectorRef}>
            <Button
              type="button"
              onClick={() => setIsColumnSelectorOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <FiChevronDown className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              {columnSelectorLabel}
            </Button>
            {isColumnSelectorOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 max-h-72 overflow-y-auto">
                <div className="p-2">
                  {orderedColumns.map((col) => {
                    const isVisible = visibleColumns.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleToggleColumn(col.key)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="truncate">{col.header}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sort dropdown */}
      {sortOptions.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort by</span>
          <select
            value={effectiveSortColumn || ""}
            onChange={(e) => {
              const key = e.target.value;
              if (!key) return;
              const newDirection = effectiveSortColumn === key && effectiveSortDirection === "asc" ? "desc" : "asc";
              if (onSortChange) {
                onSortChange({ field: key, direction: newDirection });
              } else if (onSort) {
                onSort(key);
              }
            }}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">Default</option>
            {sortOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label} {effectiveSortColumn === opt.key ? (effectiveSortDirection === "asc" ? "â†‘" : "â†“") : ""}

              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className="overflow-x-auto"
        style={{ maxHeight: maxHeight || undefined, minHeight: minHeight || undefined }}
      >
        <table className={tableClasses} aria-label={ariaLabel}>
          <thead className={theadClasses}>
            <tr>
              {/* Selection checkbox header */}
              {rowSelection && showSelectAll && (
                <th className={["px-4 py-3 text-left w-10", cellClass].join(" ")}>
                  <input
                    type="checkbox"
                    checked={allRowsSelected}
                    ref={(el) => { if (el) el.indeterminate = someRowsSelected && !allRowsSelected; }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              {activeColumns.map((column, index) => {
                const sortable = Boolean(column.sortable && onSort);
                const draggable = Boolean(onColumnOrderChange);
                const isPinned = pinnedColumns && pinnedColumns.includes(column.key);
                return (
                  <th
                    key={column.key || index}
                    draggable={draggable}
                    onDragStart={(e) => handleColumnDragStart(e, column.key)}
                    onDragOver={handleColumnDragOver}
                    onDrop={(e) => handleColumnDrop(e, column.key)}
                    className={[
                      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 relative",
                      sortable ? "cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100" : "",
                      column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : "",
                      draggable ? "cursor-move" : "",
                      isPinned ? "sticky left-0 bg-white dark:bg-gray-800 z-10" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={sortable ? () => handleHeaderSort(column.key) : undefined}
                    style={{
                      width: columnWidths[column.key] ? columnWidths[column.key] : column.width,
                      minWidth: column.minWidth || 80,
                    }}
                  >
                    <span className={["inline-flex items-center gap-1", column.align === "center" ? "justify-center" : column.align === "right" ? "justify-end" : ""].join(" ")}>
                      {column.header}
                      {renderSortIndicator(column.key)}
                    </span>
                    {resizableColumns && (
                      <span
                        onMouseDown={(e) => handleResizeStart(e, column.key)}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-emerald-400"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={bodyClassName}>
            {loading ? (
              Array.from({ length: loadingRows }).map((_, index) => (
                <tr key={index} className="border-t border-gray-100 dark:border-gray-700">
                  {rowSelection && <td className="px-4 py-3"><div className="h-4 w-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /></td>}
                  {activeColumns.map((column, columnIndex) => (
                    <td key={`${index}-${column.key || columnIndex}`} className={[cellClass, cellClassName].join(" ")}>
                      <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !filteredRows.length ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (rowSelection ? 1 : 0)}
                  className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {emptyState || "No data available."}
                </td>
              </tr>
            ) : groupBy ? (
              Object.entries(groupedRows).map(([groupKey, groupRows]) => (
                <React.Fragment key={`group-${groupKey}`}>
                  <tr className="bg-gray-50 dark:bg-gray-700/30">
                    <td
                      colSpan={activeColumns.length + (rowSelection ? 1 : 0)}
                      className="px-4 py-2 text-xs font-bold uppercase text-gray-700 dark:text-gray-200"
                    >
                      {groupKey} <span className="text-gray-400">({groupRows.length})</span>
                    </td>
                  </tr>
                  {groupRows.map((row, rowIndex) => renderRow(row, rowIndex))}
                </React.Fragment>
              ))
            ) : (
              filteredRows.map((row, rowIndex) => renderRow(row, rowIndex))
            )}
            {summaryRow && filteredRows.length > 0 && (
              <tr className="bg-gray-50 dark:bg-gray-700/30 font-semibold border-t-2 border-gray-200 dark:border-gray-700">
                {rowSelection && <td className="px-4 py-3"></td>}
                {activeColumns.map((col) => (
                  <td key={`summary-${col.key}`} className={[cellClass, "text-gray-700 dark:text-gray-200"].join(" ")}>
                    {typeof summaryRow === "function" ? summaryRow(col, filteredRows) : (summaryRow[col.key] || "")}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasPagination && !loading && filteredRows.length > 0 && (
        <div className={["flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400 sm:px-6", footerClassName].join(" ")}>
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Showing{" "}
              <strong>
                {pagination.total === 0 ? 0 : (currentPage - 1) * currentPageSize + 1}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(currentPage * currentPageSize, pagination.total)}
              </strong>{" "}
              of <strong>{pagination.total}</strong>
            </span>
            {pageSizeOptions && (
              <select
                value={internalPageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showJumpToPage && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <span className="text-xs">Go to</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={jumpToPageValue}
                  onChange={(e) => setJumpToPageValue(e.target.value)}
                  className="w-14 rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                />
                <Button
                  type="button"
                  onClick={() => {
                    const p = parseInt(jumpToPageValue, 10);
                    if (p >= 1 && p <= totalPages && pagination && pagination.onChange) pagination.onChange(p);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                >
                  Go
                </Button>
              </div>
            )}
            <Pagination
              totalResults={(pagination && pagination.total) || 0}
              resultsPerPage={currentPageSize}
              onChange={pagination.onChange}
              label="Table pagination"
            />
          </div>
        </div>
      )}

      {infiniteScroll && hasMore && !loading && (
        <div className="px-4 py-3 text-center border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            onClick={onLoadMore}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
};

export default SortableDataTable;
