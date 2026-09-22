import { useTranslation } from "react-i18next";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Button } from "@sofia/ui";

// Windmill's Pagination hardcodes an English "Showing x-y of z" line, so the
// orders screens use this one instead: same behaviour, translated summary.
const buildPages = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage - 1 > 1) pages.add(currentPage - 1);
  if (currentPage + 1 < totalPages) pages.add(currentPage + 1);

  const sorted = [...pages].sort((a, b) => a - b);

  // "â€¦" wherever the list skips a page
  return sorted.reduce((acc, page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) acc.push(`gap-${page}`);
    acc.push(page);
    return acc;
  }, []);
};

const OrderPagination = ({
  currentPage = 1,
  resultsPerPage = 20,
  totalResults = 0,
  onChange,
}) => {
  const { t } = useTranslation();

  const totalPages = Math.max(1, Math.ceil(totalResults / resultsPerPage));
  const from = totalResults === 0 ? 0 : (currentPage - 1) * resultsPerPage + 1;
  const to = Math.min(currentPage * resultsPerPage, totalResults);

  const navButton =
    "flex h-8 min-w-8 items-center justify-center rounded-md border border-[#dcdcde] px-2 text-sm text-[#1d2327] transition-colors hover:border-[#2271b1] hover:text-[#2271b1] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#dcdcde] disabled:hover:text-[#1d2327] dark:border-gray-600 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-blue-400";

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-[#dcdcde] px-4 py-3 sm:flex-row dark:border-gray-700">
      <p className="text-sm text-[#646970] dark:text-gray-400">
        {t("OrderPaginationSummary", {
          from,
          to,
          total: totalResults,
          defaultValue: `${from}â€“${to} sur ${totalResults}`,
        })}
      </p>

      <nav className="flex items-center gap-1" aria-label={t("OrderPaginationLabel")}>
        <Button
          type="button"
          onClick={() => onChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label={t("OrderPaginationPrevious")}
          className={navButton}
        >
          <FiChevronLeft size={16} />
        </Button>

        {buildPages(currentPage, totalPages).map((page) =>
          typeof page === "string" ? (
            <span
              key={page}
              className="px-1 text-sm text-[#8c8f94] dark:text-gray-500"
            >
              â€¦
            </span>
          ) : (
            <Button
              key={page}
              type="button"
              onClick={() => onChange(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={
                page === currentPage
                  ? "flex h-8 min-w-8 items-center justify-center rounded-md border border-[#2271b1] bg-[#2271b1] px-2 text-sm font-medium text-white"
                  : navButton
              }
            >
              {page}
            </Button>
          )
        )}

        <Button
          type="button"
          onClick={() => onChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label={t("OrderPaginationNext")}
          className={navButton}
        >
          <FiChevronRight size={16} />
        </Button>
      </nav>
    </div>
  );
};

export default OrderPagination;
