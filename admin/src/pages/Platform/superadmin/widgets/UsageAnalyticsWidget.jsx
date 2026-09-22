import React from "react";
import { useTranslation } from "react-i18next";
import { formatNumber, formatBytes } from "../utils/format";

const usageItems = [
  { key: "products", labelKey: "superadminDashboard.usage.products", icon: "=" },
  { key: "variants", labelKey: "superadminDashboard.usage.variants", icon: ">" },
  { key: "categories", labelKey: "superadminDashboard.usage.categories", icon: "+" },
  { key: "images", labelKey: "superadminDashboard.usage.images", icon: "+" },
  { key: "orders", labelKey: "superadminDashboard.usage.orders", icon: "=" },
  { key: "customers", labelKey: "superadminDashboard.usage.customers", icon: "=e" },
  { key: "coupons", labelKey: "superadminDashboard.usage.coupons", icon: "-" },
  { key: "reviews", labelKey: "superadminDashboard.usage.reviews", icon: "P" },
  { key: "blogs", labelKey: "superadminDashboard.usage.blogs", icon: "=" },
  { key: "pages", labelKey: "superadminDashboard.usage.pages", icon: "=" },
  { key: "apiCalls", labelKey: "superadminDashboard.usage.apiCalls", icon: "#" },
  { key: "webhooks", labelKey: "superadminDashboard.usage.webhooks", icon: "" },
];

/**
 * Usage Analytics  products, variants, categories, images, orders, customers, etc.
 */
const UsageAnalyticsWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const usage = data?.usage || {};
  const kpi = data?.kpi || {};

  const items = usageItems.map((u) => ({
    ...u,
    label: t(u.labelKey),
    value: u.key === "storageUsed" ? formatBytes(usage[u.key]) : formatNumber(usage[u.key]),
  }));

  // Highlight the top contributors
  const topKeys = ["orders", "customers", "products", "apiCalls"];

  return (
    <div className="space-y-5">
      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(usage.products)}</p>
          <p className="text-xs text-blue-500 dark:text-blue-300">{t("superadminDashboard.usage.products")}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(usage.orders)}</p>
          <p className="text-xs text-emerald-500 dark:text-emerald-300">{t("superadminDashboard.usage.orders")}</p>
        </div>
        <div className="rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
          <p className="text-xl font-bold text-violet-600 dark:text-violet-400">{formatNumber(usage.customers)}</p>
          <p className="text-xs text-violet-500 dark:text-violet-300">{t("superadminDashboard.usage.customers")}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatNumber(usage.apiCalls)}</p>
          <p className="text-xs text-amber-500 dark:text-amber-300">{t("superadminDashboard.usage.apiCalls")}</p>
        </div>
      </div>

      {/* Full grid */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("superadminDashboard.usage.contentData")}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.key} className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-600">
              <div className="text-xl">{item.icon}</div>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{item.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Storage */}
      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.usage.storageUsed")}</p>
        <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
          {formatBytes(usage.storageUsed)} <span className="text-sm font-normal text-gray-500">{t("superadminDashboard.usage.platformQuota")}</span>
        </p>
      </div>
    </div>
  );
};

export default UsageAnalyticsWidget;
