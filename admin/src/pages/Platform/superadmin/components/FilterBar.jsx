import React from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiFilter, FiRefreshCw, FiRotateCcw } from "react-icons/fi";
import { useDashboard } from "../context/DashboardContext";
import { CButton } from "@/components/ui";

const RangeKey = {
  "7d": "range7d",
  "30d": "range30d",
  "90d": "range90d",
  "12m": "range12m",
  custom: "rangeCustom",
};

const rangeOptions = ["7d", "30d", "90d", "12m", "custom"];

const countryOptions = ["all", "US", "FR", "DE", "GB", "IN", "TN", "MA", "DZ", "AE", "SA", "BR", "MX", "CA", "AU", "SG"];
const planOptions = ["all", "Starter", "Professional", "Business", "Enterprise", "Trial"];
const providerOptions = ["all", "Stripe", "Flouci", "Konnect", "Click To Pay", "PayPal", "Razorpay"];
const statusOptions = ["all", "active", "trial", "suspended", "past_due", "canceled", "expired", "pending"];
const storeOptions = ["all", "with_orders", "no_orders", "high_revenue", "at_risk"];

const selectCls =
  "h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";

const FilterBar = ({ className = "" }) => {
  const { t } = useTranslation();
  const { filters, updateFilters, resetFilters, triggerRefresh, setRefreshInterval, refreshInterval, lastUpdated } = useDashboard();

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
        <FiFilter className="h-4 w-4" />
        <span className="text-sm font-medium">{t("superadminDashboard.filters")}</span>
      </div>

      {/* Date range */}
      <select value={filters.range} onChange={(e) => updateFilters({ range: e.target.value })} className={selectCls} aria-label={t("superadminDashboard.dateRange")}>
        {rangeOptions.map((o) => (
          <option key={o} value={o}>
            {t(`superadminDashboard.${RangeKey[o]}`)}
          </option>
        ))}
      </select>

      {filters.range === "custom" && (
        <>
          <input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => updateFilters({ startDate: e.target.value })}
            className={selectCls}
            aria-label={t("superadminDashboard.startDate")}
          />
          <span className="text-gray-400"></span>
          <input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => updateFilters({ endDate: e.target.value })}
            className={selectCls}
            aria-label={t("superadminDashboard.endDate")}
          />
        </>
      )}

      {/* Country */}
      <select value={filters.country} onChange={(e) => updateFilters({ country: e.target.value })} className={selectCls} aria-label={t("superadminDashboard.country")}>
        {countryOptions.map((c) => (
          <option key={c} value={c}>
            {c === "all" ? t("superadminDashboard.filterAllCountries") : c}
          </option>
        ))}
      </select>

      {/* Plan */}
      <select value={filters.plan} onChange={(e) => updateFilters({ plan: e.target.value })} className={selectCls} aria-label={t("superadminDashboard.plan")}>
        {planOptions.map((p) => (
          <option key={p} value={p}>
            {p === "all" ? t("superadminDashboard.filterAllPlans") : p}
          </option>
        ))}
      </select>

      {/* Provider */}
      <select value={filters.provider} onChange={(e) => updateFilters({ provider: e.target.value })} className={selectCls} aria-label={t("superadminDashboard.provider")}>
        {providerOptions.map((p) => (
          <option key={p} value={p}>
            {p === "all" ? t("superadminDashboard.filterAllProviders") : p}
          </option>
        ))}
      </select>

      {/* Status */}
      <select value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })} className={selectCls} aria-label={t("superadminDashboard.status")}>
        {statusOptions.map((s) => (
          <option key={s} value={s}>
            {s === "all" ? t("superadminDashboard.filterAllStatuses") : s}
          </option>
        ))}
      </select>

      {/* Store */}
      <select value={filters.store} onChange={(e) => updateFilters({ store: e.target.value })} className={selectCls} aria-label={t("superadminDashboard.store")}>
        {storeOptions.map((s) => (
          <option key={s} value={s}>
            {s === "all" ? t("superadminDashboard.filterAllStores") : s.replace("_", " ")}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <FiCalendar className="h-3.5 w-3.5" />
          {lastUpdated ? t("superadminDashboard.updated", { time: lastUpdated.toLocaleTimeString() }) : t("superadminDashboard.notUpdatedYet")}
        </div>
        <select
          value={refreshInterval}
          onChange={(e) => setRefreshInterval(Number(e.target.value))}
          className={selectCls}
          aria-label="Auto refresh interval"
          title="Auto-refresh interval"
        >
          <option value={0}>{t("superadminDashboard.autoOff")}</option>
          <option value={15}>{t("superadminDashboard.auto15s")}</option>
          <option value={30}>{t("superadminDashboard.auto30s")}</option>
          <option value={60}>{t("superadminDashboard.auto1m")}</option>
          <option value={300}>{t("superadminDashboard.auto5m")}</option>
        </select>
        <CButton
          onClick={triggerRefresh}
          size="sm"
          leftIcon={<FiRefreshCw className="h-4 w-4" />}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          {t("superadminDashboard.refresh")}
        </CButton>
        <CButton
          onClick={resetFilters}
          variant="outline"
          size="sm"
          leftIcon={<FiRotateCcw className="h-4 w-4" />}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Reset filters"
        >
          {t("superadminDashboard.reset")}
        </CButton>
      </div>
    </div>
  );
};

export default FilterBar;

