import { useCallback, useState } from "react";

const STORAGE_KEY = "orders_screen_options";

// One entry per toggleable column of the orders table. `key` is what the table
// looks up, so adding a column here and in OrderTable's definitions is all it
// takes for it to appear in the panel.
export const ORDER_COLUMN_OPTIONS = [
  { key: "order", labelKey: "OrderColOrder", visible: true },
  { key: "customer", labelKey: "OrderColCustomer", visible: true },
  { key: "date", labelKey: "OrderColDate", visible: true },
  { key: "status", labelKey: "OrderColStatus", visible: true },
  { key: "billing", labelKey: "OrderColBilling", visible: true },
  { key: "shipping", labelKey: "OrderColShipTo", visible: false },
  { key: "payment", labelKey: "OrderColPayment", visible: true },
  { key: "total", labelKey: "OrderColTotal", visible: true },
  { key: "actions", labelKey: "OrderColActions", visible: true },
];

export const DEFAULT_PER_PAGE = 20;
const MIN_PER_PAGE = 1;
// The API pages server-side; an unbounded value would ask it for everything.
const MAX_PER_PAGE = 200;

const DEFAULT_COLUMNS = ORDER_COLUMN_OPTIONS.reduce(
  (acc, { key, visible }) => ({ ...acc, [key]: visible }),
  {}
);

export const clampPerPage = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return DEFAULT_PER_PAGE;
  return Math.min(MAX_PER_PAGE, Math.max(MIN_PER_PAGE, parsed));
};

const readStored = () => {
  const fallback = { columns: DEFAULT_COLUMNS, perPage: DEFAULT_PER_PAGE };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    // Merged over the defaults rather than trusted as-is: a column added after
    // the preferences were saved must still show up.
    return {
      columns: { ...DEFAULT_COLUMNS, ...(parsed?.columns || {}) },
      perPage: clampPerPage(parsed?.perPage ?? DEFAULT_PER_PAGE),
    };
  } catch (err) {
    return fallback;
  }
};

// Screen options for the orders list  which columns are shown and how many
// rows a page holds  kept in localStorage so they survive a refresh.
const useOrderScreenOptions = () => {
  const [options, setOptions] = useState(readStored);

  const applyOptions = useCallback((next) => {
    const sanitised = {
      columns: { ...DEFAULT_COLUMNS, ...next.columns },
      perPage: clampPerPage(next.perPage),
    };

    setOptions(sanitised);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitised));
    } catch (err) {
      // private mode / quota: the preferences just do not outlive the session
    }

    return sanitised;
  }, []);

  return { options, applyOptions };
};

export default useOrderScreenOptions;
