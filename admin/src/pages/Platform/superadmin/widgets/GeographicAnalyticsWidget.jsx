import React from "react";
import { useTranslation } from "react-i18next";
import WorldMap from "../components/WorldMap";
import { formatMoney, formatCompact } from "../utils/format";
import SortableDataTable from "@/components/tables/SortableDataTable";

/**
 * Geographic Analytics — world map of stores & revenue by country.
 */
const GeographicAnalyticsWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const geographic = data?.geographic || {};
  const byCountry = geographic.byCountry || [];
  const revenueByCountry = geographic.revenueByCountry || [];

  // Merge store counts + revenue into single dataset
  const merged = byCountry.map((c) => {
    const rev = revenueByCountry.find((r) => r._id === c._id);
    return {
      country: c._id,
      stores: c.stores || 0,
      revenue: rev?.revenue || 0,
      transactions: rev?.transactions || 0,
    };
  });

  const mapData = merged.map((m) => ({
    country: m.country,
    value: m.stores,
    label: t("superadminDashboard.geographic.mapLabel", { country: m.country, stores: m.stores, revenue: formatMoney(m.revenue, "$", 0) }),
  }));

  const totalStores = merged.reduce((s, m) => s + m.stores, 0);
  const totalRevenue = merged.reduce((s, m) => s + m.revenue, 0);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
      </div>
    );
  }

  if (!merged.length) {
    return (
      <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        {t("superadminDashboard.geographic.noData")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.geographic.countries")}</p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{merged.length}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.geographic.storesMapped")}</p>
          <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">{totalStores}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("superadminDashboard.geographic.revenueMapped")}</p>
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCompact(totalRevenue)}</p>
        </div>
      </div>

      {/* World map */}
      <WorldMap data={mapData} valueField="value" height={240} />

      {/* Top countries table */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("superadminDashboard.geographic.topCountries")}
        </p>
        <SortableDataTable
          columns={[
            { key: "country", header: t("superadminDashboard.geographic.country"), sortable: true },
            { key: "stores", header: t("superadminDashboard.geographic.stores"), sortable: true },
            { key: "transactions", header: t("superadminDashboard.geographic.transactions"), sortable: true },
            { key: "revenue", header: t("superadminDashboard.geographic.revenue"), sortable: true },
          ]}
          rows={merged.slice(0, 6)}
          getRowKey={(row) => row.country}
          density="compact"
          bordered={false}
          pagination={null}
          renderCell={({ row, column }) => {
            if (column.key === "revenue") return formatMoney(row.revenue, "$", 0);
            return row[column.key] ?? 0;
          }}
        />
      </div>
    </div>
  );
};

export default GeographicAnalyticsWidget;
