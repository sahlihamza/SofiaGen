import React from "react";
import { FiChevronLeft, FiChevronRight, FiMoreHorizontal } from "react-icons/fi";
import { IconButton } from "@sofia/ui";
import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";

const generatePages = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [1];
  if (current > 4) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 3) pages.push("...");
  if (total > 1) pages.push(total);
  return pages;
};

const Pagination = ({ totalResults, resultsPerPage, onChange, label = "Table navigation" }) => {
  const totalPages = Math.max(1, Math.ceil((totalResults || 0) / (resultsPerPage || DEFAULT_PAGE_SIZE)));
  const currentPage = 1;
  if (totalPages <= 1) return null;

  const pages = generatePages(currentPage, totalPages);

  return (
    <nav className="users-pagination-controls" aria-label={label}>
      <IconButton
        variant="ghost"
        size="sm"
        iconOnly
        onClick={() => onChange && onChange(currentPage - 2)}
        disabled={currentPage <= 1}
        className="users-page-btn"
        aria-label="Previous page"
      >
        <FiChevronLeft size={14} />
      </IconButton>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="users-page-btn" style={{ pointerEvents: "none" }}>
            <FiMoreHorizontal size={14} />
          </span>
        ) : (
          <IconButton
            key={p}
            variant="ghost"
            size="sm"
            iconOnly
            onClick={() => onChange && onChange(p - 1)}
            className={`users-page-btn ${p === currentPage ? "users-page-btn-active" : ""}`}
            aria-current={p === currentPage ? "page" : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </IconButton>
        )
      )}
      <IconButton
        variant="ghost"
        size="sm"
        iconOnly
        onClick={() => onChange && onChange(currentPage)}
        disabled={currentPage >= totalPages}
        className="users-page-btn"
        aria-label="Next page"
      >
        <FiChevronRight size={14} />
      </IconButton>
    </nav>
  );
};

export default Pagination;
