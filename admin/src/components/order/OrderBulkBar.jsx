import { useTranslation } from "react-i18next";
import { FiPrinter, FiX } from "react-icons/fi";
import { PrimaryButton, IconButton } from "@sofia/ui";

// SFG-155 — the floating bar that appears as soon as one order is ticked, so
// a bulk action is always one click away without scrolling back up to the
// toolbar. Renders nothing on an empty selection: there is no such thing as
// "Print Labels" for zero orders.
const OrderBulkBar = ({
  selectedCount = 0,
  canPrintLabels = false,
  onPrintLabels,
  onClear,
}) => {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 md:inset-x-auto md:right-8 md:justify-end">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-[#2271b1] px-4 py-3 text-white shadow-lg dark:bg-blue-600">
        <span className="text-sm font-medium">
          {t("OrderBulkSelectedCount", { total: selectedCount })}
        </span>

        {canPrintLabels && (
          <PrimaryButton
            type="button"
            onClick={onPrintLabels}
            className="flex h-9 items-center gap-2 rounded-md bg-white/15 px-3 text-sm font-medium transition-colors hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            <FiPrinter size={16} />
            {t("OrderPrintLabelsTitle")}
          </PrimaryButton>
        )}

        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onClear}
          aria-label={t("OrderBulkClearSelection")}
          title={t("OrderBulkClearSelection")}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          <FiX size={16} />
        </IconButton>
      </div>
    </div>
  );
};

export default OrderBulkBar;
