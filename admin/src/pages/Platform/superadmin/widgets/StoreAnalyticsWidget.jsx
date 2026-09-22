import React from "react";
import { useTranslation } from "react-i18next";
import { BarChart, DoughnutChart } from "../components/Charts";
import { StatusBadge } from "../components/Badges";
import { formatNumber } from "../utils/format";

const statusColors = {
  active: "#10B981",
  suspended: "#EF4444",
  inactive: "#6B7280",
  pending: "#F59E0B",
  trial: "#0EA5E9",
};

/**
 * Store Analytics — distribution by status, plan, country + creation trend.
 */
const StoreAnalyticsWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const stores = data?.stores || {};
  const byStatus = stores.byStatus || {};
  const byPlan = stores.byPlan || [];
  const byCountry = stores.byCountry || [];
  const monthly = stores.monthly || [];

  const kpi = data?.kpi || {};
  const storeKpi = kpi.stores || {};
  const growth = kpi.growth || {};

  const statusEntries = Object.entries(byStatus).filter(([, v]) => v > 0);

  return (
    <div className="space-y-5">
      {/* Status summary chips */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.total")}</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(storeKpi.total)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.active")}</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(storeKpi.active)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.stores.newThisMonth")}</p>
          <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(growth.month)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.suspended")}</p>
          <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">{formatNumber(storeKpi.suspended)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.trial")}</p>
          <p className="mt-1 text-xl font-bold text-sky-600 dark:text-sky-400">{formatNumber(storeKpi.trial)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.today")}</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(growth.today)}</p>
        </div>
      </div>

      {/* Status distribution */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("superadminDashboard.stores.statusDistribution")}
        </p>
        <div className="flex flex-wrap gap-2">
          {statusEntries.length ? (
            statusEntries.map(([status, count]) => (
              <span key={status} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 dark:border-gray-600">
                <StatusBadge status={status} />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-500">{t("superadminDashboard.stores.noStoresYet")}</span>
          )}
        </div>
      </div>

      {/* Creation trend */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("superadminDashboard.stores.creation90")}
        </p>
        {monthly.length > 0 ? (
          <div className="h-40">
            <BarChart
              labels={monthly.map((m) => m._id || m.date)}
              datasets={[{ label: t("superadminDashboard.stores.newStores"), data: monthly.map((m) => m.count), color: "#3B82F6" }]}
              height={160}
              loading={loading}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("superadminDashboard.stores.noCreationData")}</p>
        )}
      </div>

      {/* By plan */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("superadminDashboard.stores.byPlan")}
          </p>
          {byPlan.length ? (
            <DoughnutChart
              labels={byPlan.map((p) => p.planName)}
              values={byPlan.map((p) => p.count)}
              height={180}
              loading={loading}
              centerLabel={{
                value: formatNumber(byPlan.reduce((s, p) => s + p.count, 0)),
                label: t("superadminDashboard.stores.stores"),
              }}
            />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("superadminDashboard.stores.noPlanData")}</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("superadminDashboard.stores.topCountries")}
          </p>
          {byCountry.length ? (
            <div className="space-y-2">
              {byCountry.slice(0, 5).map((c) => {
                const max = Math.max(...byCountry.map((x) => x.count), 1);
                return (
                  <div key={c._id} className="flex items-center gap-3">
                    <span className="w-10 text-sm font-semibold text-gray-700 dark:text-gray-300">{c._id}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(c.count / max) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right text-sm text-gray-600 dark:text-gray-400">{c.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("superadminDashboard.stores.noCountryData")}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreAnalyticsWidget;
