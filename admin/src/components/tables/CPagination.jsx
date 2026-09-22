import React from "react";

import { Button } from "@sofia/ui";

const CPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = "",
  disabled = false,
}) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const startPage = Math.max(1, currentPage - siblingCount);
  const endPage = Math.min(totalPages, currentPage + siblingCount);

  for (let page = startPage; page <= endPage; page += 1) {
    pages.push(page);
  }

  return (
    <nav className={["flex items-center justify-end gap-2", className].filter(Boolean).join(" ")} aria-label="Pagination">
      <Button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={disabled || currentPage === 1}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        Prev
      </Button>

      {pages.map((page) => (
        <Button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          disabled={disabled}
          className={[
            "min-w-[38px] rounded-lg border px-3 py-2 text-sm transition",
            page === currentPage
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {page}
        </Button>
      ))}

      <Button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={disabled || currentPage === totalPages}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        Next
      </Button>
    </nav>
  );
};

export default CPagination;
