import { useState } from "react";

const normalizeSearch = (str) =>
  str
    ?.toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/**
 * useTableFilters — table-level filter state: free-text search, sort

 * column/direction, status, role, country, currency, language, time
 * window. Extracted from the 834-line useFilter.js god hook.
 *
 * @returns {{
 *   filter, setFilter,
 *   sortedField, setSortedField,
 *   sortColumn, sortDirection,
 *   handleSort,
 *   searchText, setSearchText,
 *   searchUser, setSearchUser,
 *   searchCoupon, setSearchCoupon,
 *   status, setStatus,
 *   role, setRole,
 *   time, setTime,
 *   zone, setZone,
 *   country, setCountry,
 *   matches,
 * }}
 */
export const useTableFilters = () => {
  const [filter, setFilter] = useState("");
  const [sortedField, setSortedField] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchText, setSearchText] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchCoupon, setSearchCoupon] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [time, setTime] = useState("");
  const [zone, setZone] = useState("");
  const [country, setCountry] = useState("");

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  /**
   * matches(row) — applies the current text filter to a row. Returns true

   * if the row should be visible. Compares against common fields first,
   * then stringifies the row as a fallback.
   */
  const matches = (row) => {
    const needle = normalizeSearch(filter || searchText);
    if (!needle) return true;
    if (!row) return false;
    const fields = ["name", "title", "email", "slug", "code", "couponCode", "label"];
    for (const f of fields) {
      if (row[f] && normalizeSearch(row[f]).includes(needle)) return true;
    }
    return false;
  };

  return {
    filter,
    setFilter,
    sortedField,
    setSortedField,
    sortColumn,
    sortDirection,
    handleSort,
    searchText,
    setSearchText,
    searchUser,
    setSearchUser,
    searchCoupon,
    setSearchCoupon,
    status,
    setStatus,
    role,
    setRole,
    time,
    setTime,
    zone,
    setZone,
    country,
    setCountry,
    matches,
  };
};

export default useTableFilters;
