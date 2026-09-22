import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "chart.js/auto";
import { Doughnut } from "react-chartjs-2";
import { Card, CardBody } from "@windmill/react-ui";

//internal import
import AnalyticsServices from "@/services/AnalyticsServices";

// Keyed by the raw Order.status enum value (see analyticsService.js) rather
// than by array index, so a status's color/label stays fixed regardless of
// which statuses happen to have orders in a given period.
const STATUS_STYLE = {
  Pending: { color: "#94A3B8", labelKey: "AnalyticsOrderStatusPending" },
  Processing: { color: "#F97316", labelKey: "AnalyticsOrderStatusProcessing" },
  Delivered: { color: "#10B981", labelKey: "AnalyticsOrderStatusDelivered" },
  Cancel: { color: "#EF4444", labelKey: "AnalyticsOrderStatusCancel" },
};
const FALLBACK_STYLE = { color: "#8B5CF6", labelKey: "AnalyticsOrderStatusUnknown" };

const OrdersBreakdown = ({ period, startDate, endDate }) => {
  const { t } = useTranslation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (period === "custom" && (!startDate || !endDate)) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");

    const params = { period };
    if (period === "custom") {
      params.startDate = startDate;
      params.endDate = endDate;
    }

    AnalyticsServices.getOrders(params)
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
  }, [period, startDate, endDate, t]);

  const total = data?.totalOrders?.current || 0;
  const breakdown = data?.breakdown || [];
  const hasData = total > 0 && breakdown.length > 0;

  const chartData = {
    labels: breakdown.map((row) => t((STATUS_STYLE[row.status] || FALLBACK_STYLE).labelKey)),
    datasets: [
      {
        data: breakdown.map((row) => row.count),
        backgroundColor: breakdown.map((row) => (STATUS_STYLE[row.status] || FALLBACK_STYLE).color),
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    cutout: "70%",
    plugins: { legend: { display: false } },
  };

  return (
    <Card className="mt-6">
      <CardBody>
        <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4">
          {t("AnalyticsOrdersBreakdown")}
        </h3>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {loading ? (
          <div className="h-64 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        ) : !hasData ? (
          !error && <p className="text-gray-500">{t("AnalyticsNoOrdersData")}</p>
        ) : (
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
            <div className="relative w-56 h-56 shrink-0">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("AnalyticsTotalOrdersLabel")}
                </span>
              </div>
            </div>

            <ul className="flex-1 w-full space-y-2">
              {breakdown.map((row) => {
                const style = STATUS_STYLE[row.status] || FALLBACK_STYLE;
                return (
                  <li
                    key={row.status}
                    className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: style.color }}
                      />
                      {t(style.labelKey)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {row.count} ({row.percentage}%)
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default OrdersBreakdown;
