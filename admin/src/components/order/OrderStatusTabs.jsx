import { useTranslation } from "react-i18next";

//internal import
import { ORDER_STATUSES, getOrderStatusLabel } from "@/utils/orderStatus";
import { Button } from "@sofia/ui";

// WooCommerce-style status tabs. `activeStatus` is the value the API expects
// ("" = every status), so the tabs and the "Tous les statuts" select stay
// interchangeable.
const OrderStatusTabs = ({ activeStatus = "", counts = {}, onSelect }) => {
  const { t } = useTranslation();

  const tabs = [
    { value: "", label: t("OrderTabAll"), count: counts.all },
    ...ORDER_STATUSES.map((status) => ({
      value: status,
      label: getOrderStatusLabel(status, t),
      count: counts[status],
    })),
  ];

  return (
    <div className="scrollbar-hide -mb-px flex gap-1 overflow-x-auto border-b border-[#dcdcde] dark:border-gray-700">
      {tabs.map(({ value, label, count }) => {
        const isActive = activeStatus === value;

        return (
          <Button
            key={value || "all"}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSelect(value)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none ${
              isActive
                ? "border-[#2271b1] text-[#2271b1] dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-[#646970] hover:border-[#dcdcde] hover:text-[#1d2327] dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
            }`}
          >
            {label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                isActive
                  ? "bg-[#2271b1]/10 text-[#2271b1] dark:bg-blue-400/15 dark:text-blue-300"
                  : "bg-[#f0f0f1] text-[#646970] dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {/* counts land a moment after the table, so an unknown count
                  keeps the tab width stable instead of flashing a zero */}
              {count === undefined ? "â€“" : count}
            </span>
          </Button>
        );
      })}
    </div>
  );
};

export default OrderStatusTabs;
