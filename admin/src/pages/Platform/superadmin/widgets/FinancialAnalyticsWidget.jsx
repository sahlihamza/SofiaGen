import React from "react";
import { useTranslation } from "react-i18next";
import { BarChart } from "../components/Charts";
import { formatNumber, formatMoney, formatCompact } from "../utils/format";

/**
 * Financial Analytics — invoices, unpaid, taxes, coupons, discounts, profit, margin, forecast.
 */
const FinancialAnalyticsWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const financial = data?.financial || {};
  const byStatus = financial.byStatus || {};
  const unpaid = financial.unpaid || {};
  const advanced = data?.advancedMetrics || {};

  const revenue = data?.revenue || {};
  const comparison = revenue.comparison || {};

  const metrics = [
    { label: t("superadminDashboard.financial.grossRevenue"), value: formatMoney(financial.grossRevenue, "$", 0), color: "text-gray-900 dark:text-gray-100" },
    { label: t("superadminDashboard.financial.netRevenue"), value: formatMoney(financial.netRevenue, "$", 0), color: "text-emerald-600 dark:text-emerald-400" },
    { label: t("superadminDashboard.financial.taxCollected"), value: formatMoney(financial.taxCollected, "$", 0), color: "text-sky-600 dark:text-sky-400" },
    { label: t("superadminDashboard.financial.discounts"), value: formatMoney(financial.discounts, "$", 0), color: "text-orange-600 dark:text-orange-400" },
    { label: t("superadminDashboard.financial.profit"), value: formatMoney(financial.profit, "$", 0), color: "text-violet-600 dark:text-violet-400" },
    { label: t("superadminDashboard.financial.infraCost"), value: formatMoney(financial.infraCost, "$", 0), color: "text-red-600 dark:text-red-400" },
  ];

  const invoiceCounts = Object.entries(byStatus).map(([status, info]) => ({
    label: status,
    count: info?.count || 0,
    total: info?.total || 0,
  }));

  return (
    <div className="space-y-5">
      {/* Key financial metrics */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
            <p className="text-xs text-gray-500 dark:text-gray-400">{m.label}</p>
            <p className={`mt-1 text-lg font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Margin + forecast */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-600">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{financial.margin || 0}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.financial.profitMargin")}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-600">
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCompact(financial.forecast)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.financial.nextMonthForecast")}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-600">
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatNumber(unpaid.count)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("superadminDashboard.financial.unpaid", { amount: formatMoney(unpaid.total, "$", 0) })}
          </p>
        </div>
      </div>

      {/* Coupons */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/40">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(financial.couponsUsed)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.financial.couponsUsed")}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/40">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(financial.totalCoupons)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.financial.activeCoupons")}</p>
        </div>
      </div>

      {/* Invoice status distribution */}
      {invoiceCounts.length ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("superadminDashboard.financial.invoiceStatus")}
          </p>
          <div className="h-40">
            <BarChart
              labels={invoiceCounts.map((i) => i.label)}
              datasets={[{ label: "Count", data: invoiceCounts.map((i) => i.count), color: "#8B5CF6" }]}
              height={160}
              loading={loading}
            />
          </div>
        </div>
      ) : null}

      {/* Advanced revenue indicators */}
      <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("superadminDashboard.financial.revenueQuality")}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{advanced.nrr || 0}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.subscriptions.nrr")}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{advanced.grr || 0}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.subscriptions.grr")}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{advanced.mrrGrowth || 0}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.financial.mrrGrowth")}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatMoney(advanced.expansionRevenue, "$", 0)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.financial.expansionRev")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalyticsWidget;
