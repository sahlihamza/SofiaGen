import React from "react";
import { useTranslation } from "react-i18next";
import {
  FiShoppingBag,
  FiUsers,
  FiCreditCard,
  FiShoppingCart,
  FiDollarSign,
  FiTrendingUp,
  FiGlobe,
  FiCpu,
} from "react-icons/fi";
import KpiCard from "../components/KpiCard";
import { pctChange } from "../utils/format";

/**
 * KPI Cards — the "command center" row.
 * Shows platform-wide health metrics at a glance.
 */
const KpiCardsWidget = ({ data, loading = false }) => {
  const { t } = useTranslation();
  const kpi = data?.kpi || {};
  const stores = kpi.stores || {};
  const subs = kpi.subscriptions || {};
  const revenue = kpi.revenue || {};
  const mrr = kpi.mrr || {};
  const payments = kpi.payments || {};
  const orders = kpi.orders || {};
  const customers = kpi.customers || {};
  const products = kpi.products || {};
  const growth = kpi.growth || {};

  const today = revenue.today || 0;

  const cards = [
    {
      title: t("superadminDashboard.kpi.totalStores"),
      value: stores.total || 0,
      icon: FiShoppingBag,
      color: "blue",
      comparison: growth.month || 0,
      comparisonLabel: t("superadminDashboard.kpi.newThisMonth"),
      trend: growth.month > 0 ? "up" : "flat",
      sparkline: [stores.total, stores.total + growth.month, stores.total - growth.today, stores.total + growth.week, stores.total],
      tooltip: t("superadminDashboard.kpi.tooltipStores", { active: stores.active || 0, suspended: stores.suspended || 0, trial: stores.trial || 0 }),
    },
    {
      title: t("superadminDashboard.kpi.activeSubscriptions"),
      value: subs.active || 0,
      icon: FiUsers,
      color: "emerald",
      comparison: subs.renewalRate || 0,
      comparisonLabel: t("superadminDashboard.kpi.renewalRate"),
      trend: (subs.renewalRate || 0) >= 80 ? "up" : "flat",
      sparkline: [subs.total || 0, subs.active || 0, subs.trial || 0],
      tooltip: t("superadminDashboard.kpi.tooltipSubscriptions", { total: subs.total || 0, trial: subs.trial || 0, renewal: subs.renewalRate || 0 }),
    },
    {
      title: t("superadminDashboard.kpi.mrrArr"),
      value: `${Math.round(mrr.value || 0)}`,
      valueType: "money",
      icon: FiTrendingUp,
      color: "violet",
      comparison: revenue.monthlyGrowth || 0,
      comparisonLabel: t("superadminDashboard.vsLastMonth"),
      trend: (revenue.monthlyGrowth || 0) >= 0 ? "up" : "down",
      sparkline: [mrr.value || 0, mrr.arr || 0],
      tooltip: t("superadminDashboard.kpi.tooltipMrr", { mrr: mrr.value || 0, arr: mrr.arr || 0 }),
    },
    {
      title: t("superadminDashboard.kpi.revenueToday"),
      value: today,
      valueType: "money",
      icon: FiDollarSign,
      color: "orange",
      tooltip: t("superadminDashboard.kpi.tooltipRevenueToday", { month: revenue.month || 0, total: revenue.total || 0 }),
    },
    {
      title: t("superadminDashboard.kpi.failedPayments"),
      value: payments.failed || 0,
      icon: FiCreditCard,
      color: "red",
      comparison: payments.total || 0,
      comparisonLabel: t("superadminDashboard.kpi.totalPayments"),
      tooltip: t("superadminDashboard.kpi.tooltipFailedPayments", { total: payments.total || 0, pending: payments.pending || 0, today: payments.today || 0 }),
    },
    {
      title: t("superadminDashboard.kpi.totalOrders"),
      value: orders.total || 0,
      icon: FiShoppingCart,
      color: "indigo",
      comparison: orders.avgOrder || 0,
      comparisonLabel: t("superadminDashboard.kpi.avgOrderValue"),
      trend: "flat",
      sparkline: [orders.total || 0],
      tooltip: t("superadminDashboard.kpi.tooltipOrders", { avg: orders.avgOrder || 0 }),
    },
    {
      title: t("superadminDashboard.kpi.activeCustomers"),
      value: customers.total || 0,
      icon: FiUsers,
      color: "cyan",
      comparison: products.avgPerStore || 0,
      comparisonLabel: t("superadminDashboard.kpi.avgProductsPerStore"),
      trend: "flat",
      sparkline: [customers.total || 0, products.total || 0],
      tooltip: t("superadminDashboard.kpi.tooltipCustomers", { products: products.total || 0 }),
    },
    {
      title: t("superadminDashboard.kpi.apiCallsMonth"),
      value: kpi.apiCalls || 0,
      icon: FiGlobe,
      color: "gray",
      comparison: growth.month || 0,
      comparisonLabel: t("superadminDashboard.kpi.newStores"),
      trend: "flat",
      sparkline: [kpi.apiCalls || 0],
      tooltip: t("superadminDashboard.kpi.tooltipApiCalls"),
    },
    {
      title: t("superadminDashboard.kpi.users"),
      value: kpi.users?.total || 0,
      icon: FiUsers,
      color: "amber",
      comparison: kpi.users?.active || 0,
      comparisonLabel: t("superadminDashboard.kpi.activeUsers"),
      trend: "flat",
      sparkline: [kpi.users?.total || 0, kpi.users?.active || 0],
      tooltip: t("superadminDashboard.kpi.tooltipUsers", { active: kpi.users?.active || 0 }),
    },
    {
      title: t("superadminDashboard.kpi.infrastructure"),
      value: data?.infrastructure?.cpu || 0,
      valueType: "percent",
      icon: FiCpu,
      color: "emerald",
      comparison: data?.infrastructure?.ram || 0,
      comparisonLabel: t("superadminDashboard.kpi.ram"),
      trend: "flat",
      sparkline: [data?.infrastructure?.cpu || 0, data?.infrastructure?.ram || 0, data?.infrastructure?.disk || 0],
      tooltip: t("superadminDashboard.kpi.tooltipInfrastructure", { cpu: data?.infrastructure?.cpu || 0, ram: data?.infrastructure?.ram || 0, disk: data?.infrastructure?.disk || 0 }),
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <KpiCard key={i} title={t("superadminDashboard.loading")} value={0} loading />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <KpiCard key={c.title} {...c} />
      ))}
    </div>
  );
};

export default KpiCardsWidget;
