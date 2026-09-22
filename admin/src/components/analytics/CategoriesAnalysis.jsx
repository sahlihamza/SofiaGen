import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "chart.js/auto";
import { Bar } from "react-chartjs-2";
import { Card, CardBody, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";
import { FiInfo } from "react-icons/fi";

//internal import
import AnalyticsServices from "@/services/AnalyticsServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";

const BAR_COLOR = "#10B981";
const UNCATEGORIZED_COLOR = "#94A3B8";

const CategoriesAnalysis = ({ period, startDate, endDate }) => {
  const { t } = useTranslation();
  const { currency, getNumberTwo } = useUtilsFunction();

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

    AnalyticsServices.getCategories(params)
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

  const categories = data?.categories || [];
  const unattributedRevenue = data?.unattributedRevenue || 0;
  const hasData = categories.length > 0;

  // "Uncategorized" (categoryId: null) is a real product with no category
  // assigned â€” shown as a row in the table, styled distinctly. It is NOT the
  // same thing as unattributedRevenue (order items that couldn't be tied to
  // any product at all) â€” that gets its own separate callout below, never

  // merged into this table, so the two concepts can't be mistaken for each other.
  const chartData = {
    labels: categories.map((c) => (c.categoryId ? c.name : t("AnalyticsUncategorized"))),
    datasets: [
      {
        label: t("AnalyticsRevenueCol"),
        data: categories.map((c) => c.revenue),
        backgroundColor: categories.map((c) => (c.categoryId ? BAR_COLOR : UNCATEGORIZED_COLOR)),
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <Card className="mt-6">
      <CardBody>
        <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4">
          {t("AnalyticsCategoriesSection")}
        </h3>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {loading ? (
          <div className="h-56 animate-pulse rounded bg-gray-100 dark:bg-gray-700 mb-6" />
        ) : !hasData ? (
          !error && <p className="text-gray-500 mb-6">{t("AnalyticsNoCategoriesData")}</p>
        ) : (
          <>
            <div className="mb-6">
              <Bar data={chartData} options={chartOptions} />
            </div>

            <TableContainer className="rounded-lg mb-4">
              <Table>
                <TableHeader>
                  <tr>
                    <TableCell>{t("AnalyticsCategoryNameCol")}</TableCell>
                    <TableCell>{t("AnalyticsRevenueCol")}</TableCell>
                    <TableCell>{t("AnalyticsProductsSoldCol")}</TableCell>
                    <TableCell>{t("AnalyticsUnitsSoldCol")}</TableCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.categoryId || "uncategorized"}>
                      <TableCell>
                        <span
                          className={
                            cat.categoryId
                              ? "text-gray-700 dark:text-gray-300"
                              : "italic text-gray-500 dark:text-gray-400"
                          }
                        >
                          {cat.categoryId ? cat.name : t("AnalyticsUncategorized")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {currency}
                        {getNumberTwo(cat.revenue || 0)}
                      </TableCell>
                      <TableCell>{cat.distinctProductsSold}</TableCell>
                      <TableCell>{cat.unitsSold}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {!loading && unattributedRevenue > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
            <FiInfo className="mt-0.5 shrink-0" />
            <p>
              {t("AnalyticsUnattributedRevenueLabel")} : {currency}
              {getNumberTwo(unattributedRevenue)} {t("AnalyticsUnattributedRevenueExplain")}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default CategoriesAnalysis;
