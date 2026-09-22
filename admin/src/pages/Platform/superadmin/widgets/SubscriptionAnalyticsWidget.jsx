import React from "react";
import { useTranslation } from "react-i18next";
import { BarChart, DoughnutChart } from "../components/Charts";
import { StatusBadge, TrendBadge } from "../components/Badges";
import { formatNumber, formatMoney } from "../utils/format";

/**
 * Subscription Analytics — statuses, plans, MRR/ARR, events, expiring.
 */
const SubscriptionAnalyticsWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const subscriptions = data?.subscriptions || {};
  const byStatus = subscriptions.byStatus || {};
  const byPlan = subscriptions.byPlan || [];
  const events = subscriptions.events || {};
  const advanced = data?.advancedMetrics || {};
  const kpi = data?.kpi || {};

  const statusOrder = ["active", "trial", "past_due", "suspended", "canceled", "expired", "pending"];
  const statusEntries = statusOrder.filter((s) => byStatus[s]).map((s) => [s, byStatus[s]]);

  const eventKeys = { upgraded: "superadminDashboard.subscriptions.upgrades", downgraded: "superadminDashboard.subscriptions.downgrades", canceled: "superadminDashboard.subscriptions.cancellations", renewed: "superadminDashboard.subscriptions.renewals" };

  return (
    <div className="space-y-5">
      {/* KPI chips */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.total")}</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(kpi.subscriptions?.total)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.active")}</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(kpi.subscriptions?.active)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.trial")}</p>
          <p className="mt-1 text-xl font-bold text-sky-600 dark:text-sky-400">{formatNumber(kpi.subscriptions?.trial)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.subscriptions.expiring7d")}</p>
          <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{formatNumber(subscriptions.expiringSoon)}</p>
        </div>
      </div>

      {/* Status list */}
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
            <span className="text-sm text-gray-500">{t("superadminDashboard.subscriptions.noSubscriptions")}</span>
          )}
        </div>
      </div>

      {/* Events */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("superadminDashboard.subscriptions.events90")}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(eventKeys).map(([key, labelKey]) => (
            <div key={key} className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-600">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{events[key] || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t(labelKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MRR by plan */}
      {byPlan.length ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("superadminDashboard.subscriptions.subscribersMrr")}
          </p>
          <div className="space-y-3">
            {byPlan.map((p) => {
              const max = Math.max(...byPlan.map((x) => x.count), 1);
              return (
                <div key={String(p.planId)}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{p.planName}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {t("superadminDashboard.subscriptions.mrrValue", { count: p.count, mrr: formatMoney(p.mrr) })}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${(p.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Advanced retention */}
<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.subscriptions.churn")}</p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{advanced.churnRate || 0}%</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.subscriptions.nrr")}</p>
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{advanced.nrr || 0}%</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.subscriptions.grr")}</p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{advanced.grr || 0}%</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.subscriptions.trialConv")}</p>
          <p className="mt-1 text-lg font-bold text-sky-600 dark:text-sky-400">{advanced.trialConversion || 0}%</p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionAnalyticsWidget;
