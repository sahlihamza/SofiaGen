import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Input, Label, Select } from "@windmill/react-ui";
import {
  FiArrowDown,
  FiArrowUp,
  FiCreditCard,
  FiDollarSign,
  FiPackage,
  FiRotateCcw,
  FiShoppingBag,
  FiShoppingCart,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

//internal import
import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import StatCard from "@/components/dashboard/CStatCard";
import SalesChart from "@/components/analytics/SalesChart";
import OrdersBreakdown from "@/components/analytics/OrdersBreakdown";
import CustomersAnalysis from "@/components/analytics/CustomersAnalysis";
import ProductsAnalysis from "@/components/analytics/ProductsAnalysis";
import CategoriesAnalysis from "@/components/analytics/CategoriesAnalysis";
import CouponsAnalysis from "@/components/analytics/CouponsAnalysis";
import InventoryAnalysis from "@/components/analytics/InventoryAnalysis";
import RevenueReport from "@/components/analytics/RevenueReport";
import ExportMenu from "@/components/analytics/ExportMenu";
import AnalyticsServices from "@/services/AnalyticsServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import useGetCData from "@/hooks/useGetCData";

const PERIOD_OPTIONS = [
  { value: "today", labelKey: "AnalyticsPeriodToday" },
  { value: "yesterday", labelKey: "AnalyticsPeriodYesterday" },
  { value: "last7days", labelKey: "AnalyticsPeriodLast7Days" },
  { value: "last30days", labelKey: "AnalyticsPeriodLast30Days" },
  { value: "thisMonth", labelKey: "AnalyticsPeriodThisMonth" },
  { value: "thisYear", labelKey: "AnalyticsPeriodThisYear" },
  { value: "custom", labelKey: "AnalyticsPeriodCustom" },
];

// `invert: true` means a decrease is the good outcome (refunds, cancellations).
const METRICS_CONFIG = [
  { key: "totalRevenue", labelKey: "AnalyticsTotalRevenue", format: "currency", icon: FiDollarSign },
  { key: "netRevenue", labelKey: "AnalyticsNetRevenue", format: "currency", icon: FiCreditCard },
  { key: "ordersCount", labelKey: "AnalyticsOrders", format: "number", icon: FiShoppingCart },
  { key: "customersCount", labelKey: "AnalyticsCustomers", format: "number", icon: FiUsers },
  { key: "averageOrderValue", labelKey: "AnalyticsAverageOrderValue", format: "currency", icon: FiShoppingBag },
  { key: "productsSold", labelKey: "AnalyticsProductsSold", format: "number", icon: FiPackage },
  { key: "productsRefunded", labelKey: "AnalyticsProductsRefunded", format: "number", icon: FiRotateCcw, invert: true },
  { key: "cancelledOrders", labelKey: "AnalyticsCancelledOrders", format: "number", icon: FiXCircle, invert: true },
];

// null changePercent means the previous period was 0 and the current one
// isn't — there's no finite percentage for that, so it's shown as "New"
// instead of a made-up number.
const buildTrend = (changePercent, invert) => {
  if (changePercent === null || changePercent === undefined) {
    return invert ? "negative" : "positive";
  }
  if (changePercent > 0) return invert ? "negative" : "positive";
  if (changePercent < 0) return invert ? "positive" : "negative";
  return "neutral";
};

const formatChange = (changePercent, t) => {
  if (changePercent === null || changePercent === undefined) return t("AnalyticsNew");
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent}%`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const Analytics = () => {
  const { t } = useTranslation();
  const { currency, getNumberTwo } = useUtilsFunction();
  const { hasPermission } = useGetCData();
  const canView = hasPermission("analytics", "view");

  const [period, setPeriod] = useState("today");
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canView) return undefined;
    if (period === "custom" && (!customStart || !customEnd)) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");

    const params = { period };
    if (period === "custom") {
      params.startDate = customStart;
      params.endDate = customEnd;
    }

    AnalyticsServices.getDashboard(params)
      .then((res) => {
        if (cancelled) return;
        setOverview(res?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || t("AnalyticsFetchError"));
        setOverview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canView, period, customStart, customEnd, t]);

  if (!canView) {
    return (
      <>
        <PageTitle>{t("Analytics")}</PageTitle>
        <Card>
          <CardBody>
            <p className="text-red-500">{t("AnalyticsPermissionDenied")}</p>
          </CardBody>
        </Card>
      </>
    );
  }

  const metrics = overview?.metrics || {};

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle>{t("Analytics")}</PageTitle>
        <ExportMenu
          period={period}
          startDate={period === "custom" ? customStart : undefined}
          endDate={period === "custom" ? customEnd : undefined}
        />
      </div>

      <AnimatedContent>
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full sm:w-64">
                <Label>{t("AnalyticsPeriod")}</Label>
                <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </Select>
              </div>

              {period === "custom" && (
                <>
                  <div>
                    <Label>{t("AnalyticsStartDate")}</Label>
                    <Input
                      type="date"
                      value={customStart}
                      max={customEnd}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>{t("AnalyticsEndDate")}</Label>
                    <Input
                      type="date"
                      value={customEnd}
                      min={customStart}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </CardBody>
        </Card>

        {error && (
          <Card className="mb-6 border border-red-200 dark:border-red-800">
            <CardBody>
              <p className="text-red-500">{error}</p>
            </CardBody>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {METRICS_CONFIG.map((config) => {
            const metric = metrics[config.key];
            const changePercent = metric?.changePercent;
            const trend = buildTrend(changePercent, config.invert);
            const value =
              config.format === "currency"
                ? `${currency}${getNumberTwo(metric?.current || 0)}`
                : (metric?.current ?? 0).toLocaleString();

            return (
              <StatCard
                key={config.key}
                title={t(config.labelKey)}
                value={value}
                icon={<config.icon className="h-5 w-5" />}
                loading={loading}
                change={
                  <span className="inline-flex items-center gap-1">
                    {trend === "positive" && <FiArrowUp className="h-4 w-4" />}
                    {trend === "negative" && <FiArrowDown className="h-4 w-4" />}
                    {formatChange(changePercent, t)}
                  </span>
                }
                changeLabel={t("AnalyticsVsPreviousPeriod")}
                trend={trend}
              />
            );
          })}
        </div>

        <SalesChart
          period={period}
          startDate={period === "custom" ? customStart : undefined}
          endDate={period === "custom" ? customEnd : undefined}
        />

        <OrdersBreakdown
          period={period}
          startDate={period === "custom" ? customStart : undefined}
          endDate={period === "custom" ? customEnd : undefined}
        />

        <CustomersAnalysis
          period={period}
          startDate={period === "custom" ? customStart : undefined}
          endDate={period === "custom" ? customEnd : undefined}
        />

        <ProductsAnalysis
          period={period}
          startDate={period === "custom" ? customStart : undefined}
          endDate={period === "custom" ? customEnd : undefined}
        />

        <CategoriesAnalysis
          period={period}
          startDate={period === "custom" ? customStart : undefined}
          endDate={period === "custom" ? customEnd : undefined}
        />

        <CouponsAnalysis
          period={period}
          startDate={period === "custom" ? customStart : undefined}
          endDate={period === "custom" ? customEnd : undefined}
        />

        <InventoryAnalysis />

        <RevenueReport
          period={period}
          startDate={period === "custom" ? customStart : undefined}
          endDate={period === "custom" ? customEnd : undefined}
        />
      </AnimatedContent>
    </>
  );
};

export default Analytics;
