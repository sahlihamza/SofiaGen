import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import "chart.js/auto";
import { Line, Bar } from "react-chartjs-2";
import { Card, CardBody, Select } from "@windmill/react-ui";
import { Button } from "@sofia/ui";

//internal import
import AnalyticsServices from "@/services/AnalyticsServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";

const CURRENT_COLOR = "#10B981";
const COMPARE_COLOR = "#94A3B8";

// Mirrors the interval bands the backend uses to pick a default (SFG-78
// Phase 2), but split a bit finer around the 7-30 day range: a flat "day to
// month" band would let a 10-day selection offer a useless "Month" option.
const getAllowedIntervals = (durationDays) => {
  if (durationDays <= 7) return ["day"];
  if (durationDays <= 31) return ["day", "week"];
  if (durationDays <= 89) return ["day", "week", "month"];
  if (durationDays <= 365) return ["week", "month", "quarter"];
  return ["month", "quarter", "year"];
};

const INTERVAL_LABEL_KEYS = {
  day: "AnalyticsIntervalDay",
  week: "AnalyticsIntervalWeek",
  month: "AnalyticsIntervalMonth",
  quarter: "AnalyticsIntervalQuarter",
  year: "AnalyticsIntervalYear",
};

const formatBucketLabel = (dateIso, interval) => {
  const d = dayjs(dateIso);
  switch (interval) {
    case "day":
      return d.format("DD/MM");
    case "week":
      return d.format("DD/MM");
    case "month":
      return d.format("MMM YY");
    case "quarter":
      return `T${Math.floor(d.month() / 3) + 1} ${d.format("YY")}`;
    case "year":
      return d.format("YYYY");
    default:
      return d.format("DD/MM/YY");
  }
};

const computeDurationDays = (period, startDate, endDate) => {
  const now = dayjs();
  switch (period) {
    case "today":
    case "yesterday":
      return 1;
    case "last7days":
      return 7;
    case "last30days":
      return 30;
    case "thisMonth":
      return now.diff(now.startOf("month"), "day") + 1;
    case "thisYear":
      return now.diff(now.startOf("year"), "day") + 1;
    case "custom":
    default: {
      if (!startDate || !endDate) return 30;
      return Math.max(1, dayjs(endDate).diff(dayjs(startDate), "day") + 1);
    }
  }
};

const SalesChart = ({ period, startDate, endDate }) => {
  const { t } = useTranslation();
  const { currency, getNumberTwo } = useUtilsFunction();

  const durationDays = useMemo(
    () => computeDurationDays(period, startDate, endDate),
    [period, startDate, endDate]
  );
  const allowedIntervals = useMemo(() => getAllowedIntervals(durationDays), [durationDays]);

  const [selectedInterval, setSelectedInterval] = useState("");
  const [chartType, setChartType] = useState("line");
  const [visibleSeries, setVisibleSeries] = useState({ current: true, compare: true });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The interval the user had picked may no longer make sense once the
  // period changes (e.g. "Quarter" selected, then the period is narrowed to
  // 5 days)  fall back to auto rather than silently keep an invalid value.
  useEffect(() => {
    if (selectedInterval && !allowedIntervals.includes(selectedInterval)) {
      setSelectedInterval("");
    }
  }, [allowedIntervals, selectedInterval]);

  useEffect(() => {
    if (period === "custom" && (!startDate || !endDate)) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");

    const params = { period, comparePeriod: "previousPeriod" };
    if (period === "custom") {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    if (selectedInterval) params.interval = selectedInterval;

    AnalyticsServices.getSales(params)
      .then((res) => {
        if (cancelled) return;
        setData(res?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || t("AnalyticsFetchError"));
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, startDate, endDate, selectedInterval, t]);

  const chartData = useMemo(() => {
    if (!data?.series?.length) return null;

    const resolvedInterval = data.interval;
    const labels = data.series.map((point) => formatBucketLabel(point.date, resolvedInterval));
    const currentValues = data.series.map((point) => point.netSales);
    const compareSeries = data.comparePeriod?.series || [];
    const compareValues = data.series.map((_, i) => compareSeries[i]?.netSales ?? null);

    const datasets = [];
    if (visibleSeries.current) {
      datasets.push({
        label: t("AnalyticsSelectedPeriod"),
        data: currentValues,
        borderColor: CURRENT_COLOR,
        backgroundColor: chartType === "bar" ? CURRENT_COLOR : `${CURRENT_COLOR}33`,
        borderWidth: 2,
        borderDash: [],
        tension: 0.3,
        pointRadius: 2,
      });
    }
    if (visibleSeries.compare && data.comparePeriod) {
      datasets.push({
        label: t("AnalyticsComparePeriod"),
        data: compareValues,
        borderColor: COMPARE_COLOR,
        backgroundColor: chartType === "bar" ? `${COMPARE_COLOR}99` : `${COMPARE_COLOR}22`,
        borderWidth: 2,
        borderDash: chartType === "line" ? [6, 4] : [],
        tension: 0.3,
        pointRadius: 2,
      });
    }

    return { labels, datasets };
  }, [data, visibleSeries, chartType, t]);

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  const totals = data?.totals;
  const summaryItems = [
    { key: "totalSales", labelKey: "AnalyticsTotalSales" },
    { key: "netSales", labelKey: "AnalyticsNetSales" },
    { key: "taxes", labelKey: "AnalyticsTaxesCollected" },
    { key: "shippingFees", labelKey: "AnalyticsShippingFees" },
    { key: "discounts", labelKey: "AnalyticsDiscountsGranted" },
  ];

  return (
    <Card className="mt-6">
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-300">
            {t("AnalyticsSalesOverTime")}
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="w-36"
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
            >
              <option value="">{t("AnalyticsIntervalAuto")}</option>
              {allowedIntervals.map((option) => (
                <option key={option} value={option}>
                  {t(INTERVAL_LABEL_KEYS[option])}
                </option>
              ))}
            </Select>

            <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
              <Button
                type="button"
                variant={chartType === "line" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setChartType("line")}
                className="px-3 py-1.5 rounded-none"
              >
                {t("AnalyticsChartTypeLine")}
              </Button>
              <Button
                type="button"
                variant={chartType === "bar" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className="px-3 py-1.5 border-l border-gray-300 dark:border-gray-600 rounded-none"
              >
                {t("AnalyticsChartTypeBar")}
              </Button>
            </div>
          </div>
        </div>

        {/* Legend checkboxes: toggle series visibility client-side  both
            periods are always fetched, this just controls what's drawn. */}
        <div className="flex flex-wrap items-center gap-6 mb-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleSeries.current}
              onChange={(e) => setVisibleSeries((prev) => ({ ...prev, current: e.target.checked }))}
            />
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CURRENT_COLOR }} />
            {t("AnalyticsSelectedPeriod")}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleSeries.compare}
              onChange={(e) => setVisibleSeries((prev) => ({ ...prev, compare: e.target.checked }))}
            />
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COMPARE_COLOR }} />
            {t("AnalyticsComparePeriod")}
          </label>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {loading ? (
          <div className="h-64 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        ) : chartData ? (
          chartType === "line" ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )
        ) : (
          !error && <p className="text-gray-500">{t("AnalyticsNoSalesData")}</p>
        )}

        {totals && (
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 sm:grid-cols-3 lg:grid-cols-5">
            {summaryItems.map((item) => (
              <div key={item.key}>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t(item.labelKey)}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {currency}
                  {getNumberTwo(totals[item.key] || 0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default SalesChart;
