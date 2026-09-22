import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

//internal import
import {
import { Button } from "@sofia/ui";
  ORDER_COLUMN_OPTIONS,
  clampPerPage,
} from "@/hooks/useOrderScreenOptions";
import { Button } from "@sofia/ui";

// WordPress' "Screen options" tab: a panel anchored under its own toggle that
// decides which columns the table shows and how many rows fit on a page.
// Nothing is applied while the boxes are ticked â€” the draft below is what the
// panel edits, and "Appliquer" is what hands it back.
const OrderScreenOptions = ({ options, onApply }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(options);
  const containerRef = useRef(null);

  const open = () => {
    setDraft(options); // discard whatever a previous, cancelled visit left
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false);
    };
    const handleKeyDown = (e) => e.key === "Escape" && setIsOpen(false);

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleColumn = (key) =>
    setDraft((prev) => ({
      ...prev,
      columns: { ...prev.columns, [key]: !prev.columns[key] },
    }));

  const handleApply = () => {
    onApply({ ...draft, perPage: clampPerPage(draft.perPage) });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        aria-expanded={isOpen}
        className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#dcdcde] bg-white px-4 text-sm font-medium text-[#1d2327] transition-colors hover:border-[#2271b1] hover:text-[#2271b1] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
      >
        {t("ScreenOptions")}
        {isOpen ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(30rem,calc(100vw-2rem))] rounded-lg border border-[#dcdcde] bg-white p-5 text-left shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[#1d2327] dark:text-gray-200">
              {t("ScreenOptionsColumns")}
            </h2>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
              {ORDER_COLUMN_OPTIONS.map(({ key, labelKey }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 text-sm text-[#1d2327] dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(draft.columns[key])}
                    onChange={() => toggleColumn(key)}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-[#8c8f94] accent-[#2271b1] dark:border-gray-600"
                  />
                  <span className="truncate">{t(labelKey)}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="mt-5 border-t border-[#f0f0f1] pt-4 dark:border-gray-700">
            <h2 className="mb-3 text-sm font-semibold text-[#1d2327] dark:text-gray-200">
              {t("ScreenOptionsPagination")}
            </h2>
            <label className="flex flex-wrap items-center gap-3 text-sm text-[#1d2327] dark:text-gray-300">
              {t("ScreenOptionsPerPage")}
              <input
                type="number"
                min={1}
                max={200}
                step={1}
                value={draft.perPage}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, perPage: e.target.value }))
                }
                onBlur={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    perPage: clampPerPage(e.target.value),
                  }))
                }
                className="h-9 w-24 rounded-md border border-[#dcdcde] bg-white px-3 text-sm text-[#1d2327] focus:border-[#2271b1] focus:outline-none focus:ring-1 focus:ring-[#2271b1] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
            </label>
          </section>

          <div className="mt-5 flex justify-end border-t border-[#f0f0f1] pt-4 dark:border-gray-700">
            <Button
              type="button"
              onClick={handleApply}
              className="flex h-10 items-center justify-center rounded-md bg-[#2271b1] px-5 text-sm font-medium text-white transition-colors hover:bg-[#135e96] focus:outline-none focus:ring-2 focus:ring-[#2271b1] focus:ring-offset-1 dark:focus:ring-offset-gray-800"
            >
              {t("ScreenOptionsApply")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderScreenOptions;
