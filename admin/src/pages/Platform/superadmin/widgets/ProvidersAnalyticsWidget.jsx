import React from "react";
import { useTranslation } from "react-i18next";
import { ProviderBadge, StatusBadge } from "../components/Badges";
import { formatMoney, formatCompact } from "../utils/format";

const knownProviders = ["Stripe", "Flouci", "Konnect", "Click To Pay", "PayPal", "Razorpay"];

/**
 * Providers Analytics — payment gateway breakdown (Stripe, Flouci, Konnect, etc.)
 */
const ProvidersAnalyticsWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const providers = data?.providers || {};

  const list = knownProviders.map((name) => {
    const p = providers[name];
    return {
      name,
      transactions: p?.transactions || 0,
      amount: p?.amount || 0,
      errors: p?.errors || 0,
      availability: p?.availability ?? 100,
      avgLatency: p?.avgLatency || 0,
      status: p?.status || "active",
    };
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  const totalTransactions = list.reduce((s, p) => s + p.transactions, 0);
  const totalAmount = list.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/40">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalTransactions.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.providers.transactions")}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/40">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCompact(totalAmount)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.providers.totalVolume")}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/40">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{list.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.providers.providers")}</p>
        </div>
      </div>

      {/* Provider cards */}
      <div className="space-y-2">
        {list.map((p) => {
          const errorRate = p.transactions > 0 ? Math.round((p.errors / p.transactions) * 100) : 0;
          const volumeShare = totalAmount > 0 ? Math.round((p.amount / totalAmount) * 100) : 0;
          return (
            <div key={p.name} className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ProviderBadge name={p.name} />
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatMoney(p.amount, "$", 0)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.providers.transactionsShort", { count: p.transactions })}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${p.availability >= 99 ? "bg-emerald-500" : p.availability >= 95 ? "bg-amber-500" : "bg-red-500"}`} />
                  {t("superadminDashboard.providers.availability", { value: p.availability })}
                </span>
                <span>{t("superadminDashboard.providers.errorRate", { value: errorRate })}</span>
                {p.avgLatency > 0 && <span>{t("superadminDashboard.providers.latency", { value: p.avgLatency })}</span>}
                <span className="ml-auto font-medium text-gray-700 dark:text-gray-300">{t("superadminDashboard.providers.volumeShare", { value: volumeShare })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProvidersAnalyticsWidget;
