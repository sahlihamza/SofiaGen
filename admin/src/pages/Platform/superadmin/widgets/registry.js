import React from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCreditCard,
  FiDollarSign,
  FiGlobe,
  FiHeart,
  FiLayers,
  FiList,
  FiServer,
  FiShoppingBag,
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
  FiZap,
  FiGrid,
  FiCpu,
} from "react-icons/fi";

import AdvancedMetricsWidget from "./AdvancedMetricsWidget";
import KpiCardsWidget from "./KpiCardsWidget";
import RevenueAnalyticsWidget from "./RevenueAnalyticsWidget";
import StoreAnalyticsWidget from "./StoreAnalyticsWidget";
import SubscriptionAnalyticsWidget from "./SubscriptionAnalyticsWidget";
import PaymentAnalyticsWidget from "./PaymentAnalyticsWidget";
import FinancialAnalyticsWidget from "./FinancialAnalyticsWidget";
import PlatformHealthWidget from "./PlatformHealthWidget";
import InfrastructureWidget from "./InfrastructureWidget";
import UsageAnalyticsWidget from "./UsageAnalyticsWidget";
import AlertsCenterWidget from "./AlertsCenterWidget";
import RecentActivitiesWidget from "./RecentActivitiesWidget";
import TopStoresWidget from "./TopStoresWidget";
import RiskAnalysisWidget from "./RiskAnalysisWidget";
import GeographicAnalyticsWidget from "./GeographicAnalyticsWidget";
import ProvidersAnalyticsWidget from "./ProvidersAnalyticsWidget";
import QuickActionsWidget from "./QuickActionsWidget";
import ShortcutsWidget from "./ShortcutsWidget";

/**
 * Widget registry — declarative metadata for each dashboard widget.
 * Used by the Dashboard assembly for ordering, visibility, layout, and grid placement.
 */
export const WIDGETS = [
  {
    id: "kpi-cards",
    i18nKey: "kpi",
    title: "KPI Overview",
    subtitle: "Platform health at a glance",
    icon: FiGrid,
    component: KpiCardsWidget,
    defaultSize: "full", // full width
    defaultVisible: true,
  },
  {
    id: "advanced-metrics",
    i18nKey: "advanced",
    title: "Advanced Metrics",
    subtitle: "SaaS metrics: activation, LTV, NRR, churn, CAC...",
    icon: FiActivity,
    component: AdvancedMetricsWidget,
    defaultSize: "full",
    defaultVisible: true,
  },
  {
    id: "revenue-analytics",
    i18nKey: "revenue",
    title: "Revenue Analytics",
    subtitle: "MRR, ARR, growth & forecast",
    icon: FiTrendingUp,
    component: RevenueAnalyticsWidget,
    defaultSize: "full", // full width (3 cols)
    defaultVisible: true,
  },
  {
    id: "store-analytics",
    i18nKey: "store",
    title: "Store Analytics",
    subtitle: "Stores by status, plan & country",
    icon: FiShoppingBag,
    component: StoreAnalyticsWidget,
    defaultSize: "large",
    defaultVisible: true,
  },
  {
    id: "subscription-analytics",
    i18nKey: "subscription",
    title: "Subscription Analytics",
    subtitle: "Plans, MRR/ARR, renewals & churn",
    icon: FiUsers,
    component: SubscriptionAnalyticsWidget,
    defaultSize: "medium",
    defaultVisible: true,
  },
  {
    id: "payment-analytics",
    i18nKey: "payment",
    title: "Payment Analytics",
    subtitle: "Transactions, providers & failures",
    icon: FiCreditCard,
    component: PaymentAnalyticsWidget,
    defaultSize: "medium",
    defaultVisible: true,
  },
  {
    id: "financial-analytics",
    i18nKey: "financial",
    title: "Financial Analytics",
    subtitle: "Invoices, taxes, profit & margin",
    icon: FiDollarSign,
    component: FinancialAnalyticsWidget,
    defaultSize: "medium",
    defaultVisible: true,
  },
  {
    id: "platform-health",
    i18nKey: "health",
    title: "Platform Health",
    subtitle: "Service status & uptime",
    icon: FiHeart,
    component: PlatformHealthWidget,
    defaultSize: "medium",
    defaultVisible: true,
  },
  {
    id: "infrastructure",
    i18nKey: "infrastructure",
    title: "Infrastructure",
    subtitle: "CPU, RAM, disk, queues, workers",
    icon: FiServer,
    component: InfrastructureWidget,
    defaultSize: "medium",
    defaultVisible: true,
  },
  {
    id: "usage-analytics",
    i18nKey: "usage",
    title: "Usage Analytics",
    subtitle: "Content & data across the platform",
    icon: FiBarChart2,
    component: UsageAnalyticsWidget,
    defaultSize: "large",
    defaultVisible: true,
  },
  {
    id: "alert-center",
    i18nKey: "alerts",
    title: "Alert Center",
    subtitle: "Critical & warning alerts",
    icon: FiAlertTriangle,
    component: AlertsCenterWidget,
    defaultSize: "medium",
    defaultVisible: true,
  },
  {
    id: "recent-activities",
    i18nKey: "activities",
    title: "Recent Activities",
    subtitle: "Latest audit trail",
    icon: FiList,
    component: RecentActivitiesWidget,
    defaultSize: "medium",
    defaultVisible: true,
  },
  {
    id: "top-stores",
    i18nKey: "topStores",
    title: "Top Stores",
    subtitle: "Highest revenue stores",
    icon: FiShoppingCart,
    component: TopStoresWidget,
    defaultSize: "large",
    defaultVisible: true,
  },
  {
    id: "risk-analysis",
    i18nKey: "risk",
    title: "Risk Analysis",
    subtitle: "At-risk stores & churn signals",
    icon: FiAlertTriangle,
    component: RiskAnalysisWidget,
    defaultSize: "medium",
    defaultVisible: true,
  },
  {
    id: "geographic-analytics",
    i18nKey: "geographic",
    title: "Geographic Analytics",
    subtitle: "Stores & revenue by country",
    icon: FiGlobe,
    component: GeographicAnalyticsWidget,
    defaultSize: "large",
    defaultVisible: true,
  },
  {
    id: "providers-analytics",
    i18nKey: "providers",
    title: "Payment Providers",
    subtitle: "Gateway performance",
    icon: FiZap,
    component: ProvidersAnalyticsWidget,
    defaultSize: "medium",
    defaultVisible: true,
  },
  {
    id: "quick-actions",
    i18nKey: "quickActions",
    title: "Quick Actions",
    subtitle: "Frequent platform operations",
    icon: FiActivity,
    component: QuickActionsWidget,
    defaultSize: "full",
    defaultVisible: true,
  },
  {
    id: "shortcuts",
    i18nKey: "shortcuts",
    title: "Shortcuts",
    subtitle: "Navigate to key sections",
    icon: FiLayers,
    component: ShortcutsWidget,
    defaultSize: "full",
    defaultVisible: true,
  },
];

export const getWidgetById = (id) => WIDGETS.find((w) => w.id === id);

