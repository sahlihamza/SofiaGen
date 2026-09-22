import { useTranslation } from "react-i18next";
import {
  FiChevronDown,
  FiRotateCcw,
  FiSearch,
  FiSliders,
} from "react-icons/fi";
import { PrimaryButton, SecondaryButton } from "@sofia/ui";


//internal import
import {
import { Button } from "@sofia/ui";
  ORDER_STATUSES,
  PAYMENT_METHOD_KEYS,
  getOrderStatusLabel,
  getPaymentMethodLabel,
} from "@/utils/orderStatus";

const DATE_RANGE_DAYS = ["5", "7", "15", "30"];

const controlBase =
  "h-10 w-full rounded-md border border-[#dcdcde] bg-white px-3 text-sm text-[#1d2327] placeholder-[#8c8f94] transition-colors focus:border-[#2271b1] focus:outline-none focus:ring-1 focus:ring-[#2271b1] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500";

const Select = ({ value, onChange, children, ariaLabel }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      className={`${controlBase} cursor-pointer appearance-none pr-9`}
    >
      {children}
    </select>
    <FiChevronDown
      size={16}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#646970] dark:text-gray-400"
    />
  </div>
);

const primaryButton =
  "flex h-10 items-center justify-center gap-2 rounded-md bg-[#2271b1] px-4 text-sm font-medium text-white transition-colors hover:bg-[#135e96] focus:outline-none focus:ring-2 focus:ring-[#2271b1] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800";

const secondaryButton =
  "flex h-10 items-center justify-center gap-2 rounded-md border border-[#dcdcde] bg-white px-4 text-sm font-medium text-[#1d2327] transition-colors hover:border-[#2271b1] hover:text-[#2271b1] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-400";

const OrderToolbar = ({
  searchRef,
  onSubmit,
  onReset,
  filters,
  setFilter,
  customers = [],
  showAdvanced,
  onToggleAdvanced,
  bulkAction,
  setBulkAction,
  onApplyBulk,
  selectedCount = 0,
  canBulkEdit = true,
  isBulkRunning = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-[#dcdcde] bg-white dark:border-gray-700 dark:bg-gray-800">
      <form onSubmit={onSubmit} className="space-y-3 p-4">
        <div className="relative">
          <FiSearch
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8f94]"
          />
          <input
            ref={searchRef}
            type="search"
            name="search"
            placeholder={t("OrderSearchPlaceholder")}
            aria-label={t("OrderSearchPlaceholder")}
            className={`${controlBase} pl-10`}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto_auto]">
          <Select
            ariaLabel={t("OrderFilterAllDates")}
            value={filters.time}
            onChange={(e) => setFilter("time", e.target.value)}
          >
            <option value="">{t("OrderFilterAllDates")}</option>
            {DATE_RANGE_DAYS.map((days) => (
              <option key={days} value={days}>
                {t("OrderFilterLastDays", {
                  days,
                  defaultValue: `${days} derniers jours`,
                })}
              </option>
            ))}
          </Select>

          <Select
            ariaLabel={t("OrderFilterByCustomer")}
            value={filters.customer}
            onChange={(e) => setFilter("customer", e.target.value)}
          >
            <option value="">{t("OrderFilterByCustomer")}</option>
            {customers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            ariaLabel={t("OrderFilterAllStatuses")}
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">{t("OrderFilterAllStatuses")}</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getOrderStatusLabel(status, t)}
              </option>
            ))}
          </Select>

          <PrimaryButton type="submit" className={primaryButton}>
            {t("OrderFilterApply")}
          </PrimaryButton>

          <SecondaryButton type="button" onClick={onReset} className={secondaryButton}>
            <FiRotateCcw size={15} />
            {t("OrderFilterReset")}
          </SecondaryButton>

          <SecondaryButton
            type="button"
            onClick={onToggleAdvanced}
            aria-expanded={showAdvanced}
            className={secondaryButton}
          >
            <FiSliders size={15} />
            {t("OrderFilterAdvanced")}
          </SecondaryButton>
        </div>

        {showAdvanced && (
          <div className="grid gap-3 border-t border-[#f0f0f1] pt-3 sm:grid-cols-2 xl:grid-cols-3 dark:border-gray-700">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#646970] dark:text-gray-400">
                {t("OrderFilterStartDate")}
              </span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilter("startDate", e.target.value)}
                className={controlBase}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#646970] dark:text-gray-400">
                {t("OrderFilterEndDate")}
              </span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilter("endDate", e.target.value)}
                className={controlBase}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#646970] dark:text-gray-400">
                {t("OrderFilterPaymentMethod")}
              </span>
              <Select
                ariaLabel={t("OrderFilterPaymentMethod")}
                value={filters.method}
                onChange={(e) => setFilter("method", e.target.value)}
              >
                <option value="">{t("OrderFilterAllPaymentMethods")}</option>
                {PAYMENT_METHOD_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {getPaymentMethodLabel(key, t)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        )}
      </form>

      {/* Bulk actions sit outside the filter form so pressing Enter in the
          search field can never trigger them. */}
      <div className="flex flex-col gap-3 border-t border-[#f0f0f1] px-4 py-3 sm:flex-row sm:items-center dark:border-gray-700">
        <div className="flex flex-1 items-center gap-2 sm:max-w-md">
          <div className="flex-1">
            <Select
              ariaLabel={t("OrderBulkActions")}
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">{t("OrderBulkActions")}</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={`status:${status}`}>
                  {t("OrderBulkMarkAs", {
                    status: getOrderStatusLabel(status, t),
                    defaultValue: `Marquer comme ${getOrderStatusLabel(status, t)}`,
                  })}
                </option>
              ))}
              <option value="delete">{t("OrderBulkDelete")}</option>
            </Select>
          </div>
          <Button
            type="button"
            onClick={onApplyBulk}
            disabled={!canBulkEdit || isBulkRunning}
            className={secondaryButton}
          >
            {t("OrderBulkApply")}
          </Button>
        </div>

        <p className="text-sm text-[#646970] dark:text-gray-400">
          {selectedCount > 0
            ? t("OrderBulkSelectedCount", {
                total: selectedCount,
                defaultValue: `${selectedCount} sÃ©lectionnÃ©e(s)`,
              })
            : t("OrderBulkNoSelectionHint")}
        </p>
      </div>
    </div>
  );
};

export default OrderToolbar;
