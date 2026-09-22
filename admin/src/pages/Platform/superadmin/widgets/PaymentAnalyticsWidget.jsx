import React from "react";
import { useTranslation } from "react-i18next";
import { DoughnutChart } from "../components/Charts";
import { StatusBadge, TrendBadge } from "../components/Badges";
import { formatNumber, formatMoney, formatCompact } from "../utils/format";

/**
 * Payment Analytics — transactions, success/failure, providers, currencies, countries.
 */
const PaymentAnalyticsWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const payments = data?.payments || {};
  const byStatus = payments.byStatus || {};
  const byGateway = payments.byGateway || {};
  const byCurrency = payments.byCurrency || {};
  const byCountry = payments.byCountry || [];

  const kpi = data?.kpi || {};
  const paymentKpi = kpi.payments || {};

  const totalCount = Object.values(byStatus).reduce((s, v) => s + (v?.count || 0), 0);
  const totalAmount = Object.values(byStatus).reduce((s, v) => s + (v?.total || 0), 0);
  const successCount = (byStatus.paid?.count || 0) + (byStatus.succeeded?.count || 0);
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100;

  const gatewayEntries = Object.entries(byGateway).sort((a, b) => b[1].total - a[1].total).slice(0, 6);

  return (
    <div className="space-y-5">
      {/* KPI chips */}
<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.payments.transactions")}</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(totalCount)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.payments.totalAmount")}</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{formatMoney(totalAmount, "$", 0)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.payments.successRate")}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {successRate}%
            <TrendBadge value={successRate - 95} suffix="" />
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.payments.failed")}</p>
          <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">{formatNumber(payments.byStatus?.failed?.count || 0)}</p>
        </div>
      </div>

      {/* Refunds / chargebacks / avg */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-600">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatNumber(payments.refunds?.count)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.payments.refunds", { amount: formatMoney(payments.refunds?.total, "$", 0) })}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-600">
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatNumber(payments.chargebacks)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.payments.chargebacks")}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-600">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatMoney(payments.avgAmount, "$", 2)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.payments.avgAmount")}</p>
        </div>
      </div>

      {/* Providers + currencies */}
<div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("superadminDashboard.payments.byProvider")}
          </p>
          {gatewayEntries.length ? (
            <div className="space-y-2">
              {gatewayEntries.map(([name, info]) => {
                const max = Math.max(...gatewayEntries.map(([, v]) => v.total), 1);
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-20 truncate text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${(info.total / max) * 100}%` }} />
                    </div>
                    <span className="w-16 text-right text-xs text-gray-500 dark:text-gray-400">
                      {formatCompact(info.total)} ({info.count})
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t("superadminDashboard.payments.noProviderData")}</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("superadminDashboard.payments.currencies")}
          </p>
          {Object.keys(byCurrency).length ? (
            <DoughnutChart
              labels={Object.keys(byCurrency)}
              values={Object.values(byCurrency).map((v) => v.count)}
              height={160}
              loading={loading}
            />
          ) : (
            <p className="text-sm text-gray-500">{t("superadminDashboard.payments.noCurrencyData")}</p>
          )}
        </div>
      </div>

      {/* By country */}
      {byCountry.length ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("superadminDashboard.payments.byCountry")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {byCountry.slice(0, 5).map((c) => (
              <div key={c._id} className="rounded-lg border border-gray-200 p-2.5 text-center dark:border-gray-600">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{c._id}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.payments.transactionsShort", { count: c.count })}</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{formatCompact(c.total)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PaymentAnalyticsWidget;
