import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FiLayout, FiRotateCcw } from "react-icons/fi";
import platformDashboardV2API from "@/services/api/platformDashboardV2API";
import PageTitle from "@/components/Typography/PageTitle";
import { CButton } from "@/components/ui";
import { DashboardProvider, useDashboard } from "./context/DashboardContext";
import FilterBar from "./components/FilterBar";
import WidgetFrame, { WidgetToggleBar } from "./components/WidgetFrame";
import { WIDGETS } from "./widgets/registry";
import { WidgetError } from "./components/WidgetStates";

/**
 * Maps each widget id to the dedicated API endpoints it needs and the
 * top-level key each endpoint's response is exposed under (matching the
 * shape the widget components expect from the aggregated payload).
 *
 * Widgets without a config (QuickActions, Shortcuts) are static and don't
 * fetch data  they fall back to the aggregated payload if present.
 */
const USE_FULL_DASHBOARD = true;

const WIDGET_DATA_SOURCES = {
  "kpi-cards": [
    { fn: platformDashboardV2API.getKPIs, key: "kpi" },
    { fn: platformDashboardV2API.getInfrastructure, key: "infrastructure" },
  ],
  "advanced-metrics": [{ fn: platformDashboardV2API.getAdvancedMetrics, key: "advancedMetrics" }],
  "revenue-analytics": [{ fn: platformDashboardV2API.getRevenueAnalytics, key: "revenue", acceptsFilters: true }],
  "store-analytics": [{ fn: platformDashboardV2API.getStoreAnalytics, key: "stores", acceptsFilters: true }],
  "subscription-analytics": [{ fn: platformDashboardV2API.getSubscriptionAnalytics, key: "subscriptions", acceptsFilters: true }],
  "payment-analytics": [{ fn: platformDashboardV2API.getPaymentAnalytics, key: "payments", acceptsFilters: true }],
  "financial-analytics": [{ fn: platformDashboardV2API.getFinancialAnalytics, key: "financial" }],
  "platform-health": [{ fn: platformDashboardV2API.getPlatformHealth, key: "health" }],
  "infrastructure": [{ fn: platformDashboardV2API.getInfrastructure, key: "infrastructure" }],
  "usage-analytics": [{ fn: platformDashboardV2API.getUsageAnalytics, key: "usage" }],
  "alert-center": [{ fn: platformDashboardV2API.getAlerts, key: "alerts" }],
  "recent-activities": [{ fn: platformDashboardV2API.getRecentActivity, key: "recentActivity", acceptsFilters: true }],
  "top-stores": [{ fn: platformDashboardV2API.getTopStores, key: "topStores", acceptsFilters: true }],
  "risk-analysis": [{ fn: platformDashboardV2API.getRiskAnalysis, key: "risk" }],
  "geographic-analytics": [{ fn: platformDashboardV2API.getGeographicAnalytics, key: "geographic" }],
  "providers-analytics": [{ fn: platformDashboardV2API.getProvidersAnalytics, key: "providers" }],
};

const WIDGET_FULL_DASHBOARD_KEYS = {
  "kpi-cards": (d) => ({ kpi: d?.kpi, infrastructure: d?.infrastructure }),
  "advanced-metrics": (d) => ({ advancedMetrics: d?.advancedMetrics }),
  "revenue-analytics": (d) => ({ revenue: d?.revenue }),
  "store-analytics": (d) => ({ stores: d?.stores }),
  "subscription-analytics": (d) => ({ subscriptions: d?.subscriptions }),
  "payment-analytics": (d) => ({ payments: d?.payments }),
  "financial-analytics": (d) => ({ financial: d?.financial }),
  "platform-health": (d) => ({ health: d?.health }),
  "infrastructure": (d) => ({ infrastructure: d?.infrastructure }),
  "usage-analytics": (d) => ({ usage: d?.usage }),
  "alert-center": (d) => ({ alerts: d?.alerts }),
  "recent-activities": (d) => ({ recentActivity: d?.recentActivity }),
  "top-stores": (d) => ({ topStores: d?.topStores }),
  "risk-analysis": (d) => ({ risk: d?.risk }),
  "geographic-analytics": (d) => ({ geographic: d?.geographic }),
  "providers-analytics": (d) => ({ providers: d?.providers }),
};

/**
 * Builds an axios params object from the global dashboard filters.
 * Excludes "all" values and applies a sensible default page size.
 */
const buildQueryParams = (filters = {}) => {
  const params = {};
  if (filters.range) params.range = filters.range;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.country && filters.country !== "all") params.country = filters.country;
  if (filters.plan && filters.plan !== "all") params.plan = filters.plan;
  if (filters.provider && filters.provider !== "all") params.provider = filters.provider;
  if (filters.status && filters.status !== "all") params.status = filters.status;
  if (filters.store && filters.store !== "all") params.store = filters.store;
  return params;
};

/**
 * WidgetLoader  fetches a single widget's data via its dedicated
 * endpoints, allowing independent loading, per-widget refresh and
 * partial error handling across the dashboard.
 */
const WidgetLoader = ({ widget, filters, refreshKey, sharedData, fullLoading }) => {
  const { t } = useTranslation();
  const sources = WIDGET_DATA_SOURCES[widget.id];

  const queries = sources
    ? sources.map((s) =>
        useQuery({
          queryKey: [widget.id, s.key, refreshKey, filters],
          queryFn: () => (s.acceptsFilters ? s.fn(buildQueryParams(filters)) : s.fn()),
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
          enabled: !sharedData,
        })
      )
    : [];

  const data = {};
  queries.forEach((q, i) => {
    if (sources) data[sources[i].key] = q.data?.data;
  });

  const loading = queries.some((q) => q.isLoading);
  const firstError = queries.find((q) => q.error);

  const Component = widget.component;

  if (!sources) {
    return <Component data={{}} loading={false} />;
  }

  if (sharedData) {
    return <Component data={sharedData} loading={fullLoading} />;
  }

  if (firstError) {
    return (
      <WidgetError
        message={
          firstError.error?.response?.data?.message ||
          firstError.error?.message ||
          t("superadminDashboard.failedToLoad")
        }
        onRetry={() => queries.forEach((q) => q.refetch())}
      />
    );
  }

  return <Component data={data} loading={loading} />;
};

/**
 * DashboardContent  renders widgets with drag & drop, visibility
 * toggling, and persisted layout. Each widget fetches its own data via the
 * dedicated analytics endpoints.
 */
const DashboardContent = () => {
  const { t } = useTranslation();
  const { refreshKey, filters, triggerRefresh, visibility, resetLayout } = useDashboard();

  const { data: fullDashboard, isLoading: fullLoading, error: fullError } = useQuery({
    queryKey: ["dashboard-full", refreshKey],
    queryFn: () => platformDashboardV2API.getFullDashboard(),
    enabled: USE_FULL_DASHBOARD,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const visibleWidgets = WIDGETS.filter((w) => visibility[w.id] !== false);

  return (
    <div className="space-y-4">
      <FilterBar />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <WidgetToggleBar />
        <CButton
          onClick={resetLayout}
          variant="outline"
          size="sm"
          leftIcon={<FiRotateCcw className="h-3.5 w-3.5" />}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t("superadminDashboard.resetLayout")}
        </CButton>
      </div>

      {USE_FULL_DASHBOARD && fullError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {fullError?.response?.data?.message || fullError?.message || t("superadminDashboard.failedToLoad")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {visibleWidgets.map((widget) => {
          const size = widget.defaultSize || "medium";
          const spanClass =
            size === "full"
              ? "lg:col-span-2 xl:col-span-3"
              : size === "large"
              ? "xl:col-span-2"
              : "";

          const sharedData = USE_FULL_DASHBOARD && fullDashboard?.data
            ? WIDGET_FULL_DASHBOARD_KEYS[widget.id]?.(fullDashboard.data) || {}
            : null;

          return (
            <div key={widget.id} className={`min-h-[200px] ${spanClass}`}>
              <WidgetFrame
                id={widget.id}
                title={widget.i18nKey ? t(`superadminDashboard.wTitle.${widget.i18nKey}`) : widget.title}
                subtitle={widget.i18nKey ? t(`superadminDashboard.wSubtitle.${widget.i18nKey}`) : widget.subtitle}
                icon={widget.icon}
              >
                <WidgetLoader widget={widget} filters={filters} refreshKey={refreshKey} sharedData={sharedData} fullLoading={USE_FULL_DASHBOARD ? fullLoading : false} />
              </WidgetFrame>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * SuperAdminDashboard  main export, wraps everything in providers.
 */
const SuperAdminDashboard = () => {
  const { t } = useTranslation();
  return (
    <DashboardProvider>
      <DndProvider backend={HTML5Backend}>
        <div className="mx-auto w-full px-4 md:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <PageTitle>Dashboard</PageTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <FiLayout className="h-4 w-4" />
              {t("superadminDashboard.dragHint")}
            </div>
          </div>
          <DashboardContent />
        </div>
      </DndProvider>
    </DashboardProvider>
  );
};

export default SuperAdminDashboard;

