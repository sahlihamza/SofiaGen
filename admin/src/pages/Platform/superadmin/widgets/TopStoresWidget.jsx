import React from "react";
import { useTranslation } from "react-i18next";
import { formatNumber, formatMoney, formatCompact } from "../utils/format";
import { Link } from "react-router-dom";
import SortableDataTable from "@/components/tables/SortableDataTable";
import { StatusBadge } from "@/components/ui";

/**
 * Top Stores — table of highest revenue stores.
 */
const TopStoresWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const stores = data?.topStores || [];

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  if (!stores.length) {
    return (
      <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("superadminDashboard.topStores.noTopStores")}</div>
    );
  }

  return (
    <SortableDataTable
      columns={[
        { key: "name", header: t("superadminDashboard.topStores.store"), sortable: true },
        { key: "owner", header: t("superadminDashboard.topStores.owner"), sortable: true },
        { key: "plan", header: t("superadminDashboard.topStores.plan"), sortable: true },
        { key: "revenue", header: t("superadminDashboard.topStores.revenue"), sortable: true },
        { key: "orders", header: t("superadminDashboard.topStores.orders"), sortable: true },
        { key: "status", header: t("superadminDashboard.topStores.status"), sortable: true },
      ]}
      rows={stores.slice(0, 8)}
      getRowKey={(row) => String(row.storeId)}
      density="compact"
      bordered={false}
      pagination={null}
      renderCell={({ row, column }) => {
        switch (column.key) {
          case "name":
            return <Link to={`/stores/${row.storeId}`} className="font-medium text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400">{row.name}</Link>;
          case "plan":
            return <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">{row.plan}</span>;
          case "revenue":
            return formatMoney(row.revenue, "$", 0);
          case "orders":
            return formatNumber(row.orders);
          case "status":
            return <StatusBadge status={row.status} />;
          default:
            return row[column.key];
        }
      }}
    />
  );
};

export default TopStoresWidget;
