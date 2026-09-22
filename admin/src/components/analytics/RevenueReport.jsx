import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";

//internal import
import AnalyticsServices from "@/services/AnalyticsServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";

// Fixed display order per the ticket (gross, net, taxes, shipping, refunds,
// discounts, final) â€” deliberately not Object.entries(data.report) order,
// which follows the backend's computation order instead.
const ROW_CONFIG = [
  { key: "grossRevenue", labelKey: "AnalyticsRevenueGross" },
  { key: "netRevenue", labelKey: "AnalyticsRevenueNet" },
  { key: "taxes", labelKey: "AnalyticsRevenueTaxes" },
  { key: "shipping", labelKey: "AnalyticsRevenueShipping" },
  { key: "refunds", labelKey: "AnalyticsRevenueRefunds" },
  { key: "discounts", labelKey: "AnalyticsRevenueDiscounts" },
  { key: "finalRevenue", labelKey: "AnalyticsRevenueFinal" },
];

const formatChange = (changePercent, t) => {
  if (changePercent === null || changePercent === undefined) return t("AnalyticsNew");
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent}%`;
};

const RevenueReport = ({ period, startDate, endDate }) => {
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

    AnalyticsServices.getRevenue(params)
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

  const report = data?.report || {};

  return (
    <Card className="mt-6">
      <CardBody>
        <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4">
          {t("AnalyticsRevenueReportSection")}
        </h3>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {loading ? (
          <div className="h-56 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        ) : (
          <TableContainer className="rounded-lg">
            <Table>
              <TableHeader>
                <tr>
                  <TableCell>{t("AnalyticsMetricCol")}</TableCell>
                  <TableCell>{t("AnalyticsCurrentValueCol")}</TableCell>
                  <TableCell>{t("AnalyticsPreviousValueCol")}</TableCell>
                  <TableCell>{t("AnalyticsChangeCol")}</TableCell>
                </tr>
              </TableHeader>
              <TableBody>
                {ROW_CONFIG.map((row) => {
                  const metric = report[row.key];
                  const changePercent = metric?.changePercent;
                  const isPositive = changePercent !== null && changePercent !== undefined && changePercent > 0;
                  const isNegative = changePercent !== null && changePercent !== undefined && changePercent < 0;

                  return (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium text-gray-700 dark:text-gray-300">
                        {t(row.labelKey)}
                      </TableCell>
                      <TableCell>
                        {currency}
                        {getNumberTwo(metric?.current || 0)}
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">
                        {currency}
                        {getNumberTwo(metric?.previous || 0)}
                      </TableCell>
                      <TableCell
                        className={
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isNegative
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400"
                        }
                      >
                        {formatChange(changePercent, t)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardBody>
    </Card>
  );
};

export default RevenueReport;
