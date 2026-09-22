import { useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";

/**
 * usePagination — manage a list page's current page and page size.

 * Centralises the tiny pattern that was previously inlined in every
 * paginated list (and a 834-line god hook).
 *
 * @param {number} [pageSize=DEFAULT_PAGE_SIZE] - default page size
 * @param {number} [initialPage=0] - 0-indexed initial page
 * @returns {{
 *   page: number,
 *   setPage: (n: number) => void,
 *   resultsPerPage: number,
 *   setResultsPerPage: (n: number) => void,
 *   handleChangePage: (next: number) => void,
 *   paginate: <T>(rows: T[]) => T[],
 *   totalResults: number,
 *   setTotalResults: (n: number) => void,
 * }}
 */
export const usePagination = (pageSize = DEFAULT_PAGE_SIZE, initialPage = 0) => {
  const [page, setPage] = useState(initialPage);
  const [resultsPerPage, setResultsPerPage] = useState(pageSize);
  const [totalResults, setTotalResults] = useState(0);

  const handleChangePage = (next) => {
    setPage(typeof next === "number" ? next : 0);
  };

  const paginate = (rows) => {
    if (!Array.isArray(rows)) return [];
    const start = page * resultsPerPage;
    return rows.slice(start, start + resultsPerPage);
  };

  return {
    page,
    setPage,
    resultsPerPage,
    setResultsPerPage,
    handleChangePage,
    paginate,
    totalResults,
    setTotalResults,
  };
};

export default usePagination;
