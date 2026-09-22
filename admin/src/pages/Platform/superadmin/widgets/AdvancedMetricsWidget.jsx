import React from "react";
import { useTranslation } from "react-i18next";
import { FiActivity, FiTrendingUp, FiUsers, FiDollarSign, FiShoppingBag, FiAlertTriangle } from "react-icons/fi";

const AdvancedMetricsWidget = ({ data = {}, loading = false }) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-3 h-8 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    { key: "activationRate", label: t("superadminDashboard.advanced.activationRate") || "Activation Rate", value: data.activationRate, suffix: "%", icon: FiActivity, color: "blue" },
    { key: "trialConversion", label: t("superadminDashboard.advanced.trialConversion") || "Trial Conversion", value: data.trialConversion, suffix: "%", icon: FiTrendingUp, color: "emerald" },
    { key: "mrr", label: t("superadminDashboard.advanced.mrr") || "MRR", value: data.mrr, valueType: "money", icon: FiDollarSign, color: "violet" },
    { key: "arr", label: t("superadminDashboard.advanced.arr") || "ARR", value: data.arr, valueType: "money", icon: FiDollarSign, color: "indigo" },
    { key: "arpu", label: t("superadminDashboard.advanced.arpu") || "ARPU", value: data.arpu, valueType: "money", icon: FiUsers, color: "cyan" },
    { key: "cac", label: t("superadminDashboard.advanced.cac") || "CAC", value: data.cac, valueType: "money", icon: FiUsers, color: "orange" },
    { key: "ltv", label: t("superadminDashboard.advanced.ltv") || "LTV", value: data.ltv, valueType: "money", icon: FiDollarSign, color: "green" },
    { key: "nrr", label: t("superadminDashboard.advanced.nrr") || "NRR", value: data.nrr, suffix: "%", icon: FiTrendingUp, color: "emerald" },
    { key: "grr", label: t("superadminDashboard.advanced.grr") || "GRR", value: data.grr, suffix: "%", icon: FiTrendingUp, color: "blue" },
    { key: "churnRate", label: t("superadminDashboard.advanced.churnRate") || "Churn Rate", value: data.churnRate, suffix: "%", icon: FiAlertTriangle, color: "red" },
    { key: "expansionRevenue", label: t("superadminDashboard.advanced.expansionRevenue") || "Expansion Revenue", value: data.expansionRevenue, valueType: "money", icon: FiTrendingUp, color: "violet" },
    { key: "mrrGrowth", label: t("superadminDashboard.advanced.mrrGrowth") || "MRR Growth", value: data.mrrGrowth, suffix: "%", icon: FiActivity, color: "emerald" },
    { key: "avgStoreRevenue", label: t("superadminDashboard.advanced.avgStoreRevenue") || "Avg Store Revenue", value: data.avgStoreRevenue, valueType: "money", icon: FiShoppingBag, color: "blue" },
    { key: "avgOrders", label: t("superadminDashboard.advanced.avgOrders") || "Avg Orders/Store", value: data.avgOrders, icon: FiShoppingBag, color: "indigo" },
    { key: "avgCustomers", label: t("superadminDashboard.advanced.avgCustomers") || "Avg Customers/Store", value: data.avgCustomers, icon: FiUsers, color: "cyan" },
    { key: "avgProducts", label: t("superadminDashboard.advanced.avgProducts") || "Avg Products/Store", value: data.avgProducts, icon: FiShoppingBag, color: "gray" },
  ];

  const colorMap = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    green: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    red: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    gray: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
  };

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.key} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorMap[m.color]}`}>
              <m.icon className="h-4 w-4" />
            </span>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{m.label}</p>
          </div>
          <p className="mt-3 text-xl font-bold text-gray-900 dark:text-gray-100">
            {m.value ?? "-"}
            {m.suffix && <span className="ml-1 text-sm font-medium text-gray-500">{m.suffix}</span>}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AdvancedMetricsWidget;
