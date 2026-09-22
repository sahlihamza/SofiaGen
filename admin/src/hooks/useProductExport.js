import { useState } from "react";

//internal import
import ProductServices from "@/services/ProductServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import {
  EXPORT_COLUMNS,
  buildCsvHeader,
  buildExportFileName,
  productToCsvRow,
} from "@/utils/productExport";

// Drives the product export drawer/modal, WooCommerce-style:
//
//   config -> generating -> done          (happy path)
//                        \-> error -> retry
//
// The product set is either the rows the user ticked in the table, or every
// product matching the active filters (fetched here). The CSV is built one row
// at a time so a broken product is reported instead of aborting the whole file,
// and so a progress bar can advance while a large catalogue is written.

const ALL_COLUMN_KEYS = EXPORT_COLUMNS.map((c) => c.key);

// Kick the download without a library: a Blob URL on a throwaway <a>. Wrapped by
// the caller's try/catch so a browser that blocks it surfaces as a retryable
// error rather than a silent no-op.
const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // revoke on the next tick so the download has started
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const useProductExport = ({
  selectedProducts = [],
  totalDoc = 0,
  filters = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // config | generating | done | error
  const [phase, setPhase] = useState("config");

  const [selectedColumns, setSelectedColumns] = useState(
    () => new Set(ALL_COLUMN_KEYS)
  );
  const [exportSelectedOnly, setExportSelectedOnly] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [format, setFormat] = useState("csv");

  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [result, setResult] = useState(null); // { count, size, fileName }
  const [errorMessage, setErrorMessage] = useState("");
  const [rowErrors, setRowErrors] = useState([]); // products that failed a row

  const selectedCount = selectedProducts.length;

  const resetRun = () => {
    setProgress({ processed: 0, total: 0 });
    setResult(null);
    setErrorMessage("");
    setRowErrors([]);
  };

  // Open in a clean config state, seeding the filters from what the page is
  // currently showing so "export all" defaults to the active filters.
  const open = () => {
    resetRun();
    setPhase("config");
    setSelectedColumns(new Set(ALL_COLUMN_KEYS));
    setExportSelectedOnly(selectedCount > 0);
    setFilterCategory(filters.category || "");
    setFilterType("all");
    setFormat("csv");
    setIsOpen(true);
  };

  // Reset the run state so the next export starts fresh (step 3 requirement).
  const close = () => {
    setIsOpen(false);
    setPhase("config");
    resetRun();
  };

  const toggleColumn = (key) =>
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectAllColumns = () => setSelectedColumns(new Set(ALL_COLUMN_KEYS));
  const deselectAllColumns = () => setSelectedColumns(new Set());

  // Every product matching the active filters + the modal's category filter.
  // A first tiny request reads the real total for this filter (the page's
  // totalDoc is for the page's own category, which the user may have changed
  // here), then a second pulls them all.
  const fetchAllMatching = async () => {
    const base = {
      category: filterCategory || "",
      productName: filters.productName || "",
      price: filters.price || "",
    };
    const probe = await ProductServices.getAllProducts({
      page: 1,
      limit: 1,
      ...base,
    });
    const total = probe?.totalDoc || probe?.products?.length || 0;
    if (!total) return probe?.products || [];
    const res = await ProductServices.getAllProducts({
      page: 1,
      limit: total,
      ...base,
    });
    return res?.products || [];
  };

  const runExport = async () => {
    const columnKeys = EXPORT_COLUMNS.filter((c) =>
      selectedColumns.has(c.key)
    ).map((c) => c.key);

    // Guarded by the disabled button too, but validate before doing any work.
    if (columnKeys.length === 0) {
      notifyError("Select at least one column to export.");
      return;
    }

    setPhase("generating");
    resetRun();

    try {
      // 1. Gather the products to export.
      let products =
        exportSelectedOnly && selectedCount > 0
          ? selectedProducts
          : await fetchAllMatching();

      // 2. Apply the product-type filter (there is no server param for it).
      if (filterType && filterType !== "all") {
        products = products.filter(
          (p) => String(p.productType || "").toLowerCase() === filterType
        );
      }

      if (!products.length) {
        setPhase("error");
        setErrorMessage(
          "No product matches the selected filters  there is nothing to export."
        );
        return;
      }

      setProgress({ processed: 0, total: products.length });

      // 3. Stream rows. A product that throws is recorded and skipped so one bad
      // record never loses the whole file.
      const lines = [buildCsvHeader(columnKeys)];
      const failed = [];
      const CHUNK = 100;

      for (let i = 0; i < products.length; i += 1) {
        try {
          lines.push(productToCsvRow(products[i], columnKeys));
        } catch (err) {
          failed.push({
            name:
              products[i]?.productName ||
              products[i]?.sku ||
              products[i]?._id ||
              `#${i + 1}`,
            message: err?.message || "could not be exported",
          });
        }

        // Repaint the progress bar every chunk and at the end.
        if ((i + 1) % CHUNK === 0 || i === products.length - 1) {
          setProgress({ processed: i + 1, total: products.length });
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // 4. Build the file. Lead BOM () so Excel reads UTF-8 accents
      // correctly; CRLF line breaks per the CSV spec.
      const csv = "" + lines.join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const fileName = buildExportFileName("products-export", "csv");

      // 5. Download.
      downloadBlob(blob, fileName);

      const exported = products.length - failed.length;
      setRowErrors(failed);
      setResult({ count: exported, size: blob.size, fileName });
      setPhase("done");
      notifySuccess(`Export ready  ${exported} product(s).`);
    } catch (err) {
      setPhase("error");
      setErrorMessage(
        err?.response?.data?.message || err?.message || "The export failed."
      );
      notifyError("The export failed  please try again.");
    }
  };

  return {
    // window
    isOpen,
    open,
    close,
    phase,
    // selection
    selectedCount,
    exportSelectedOnly,
    setExportSelectedOnly,
    // columns
    selectedColumns,
    toggleColumn,
    selectAllColumns,
    deselectAllColumns,
    // filters / format
    filterCategory,
    setFilterCategory,
    filterType,
    setFilterType,
    format,
    setFormat,
    // run
    runExport,
    retry: runExport,
    progress,
    result,
    errorMessage,
    rowErrors,
    // convenience for the summary line
    willExportAll: !(exportSelectedOnly && selectedCount > 0),
    totalDoc,
  };
};

export default useProductExport;
