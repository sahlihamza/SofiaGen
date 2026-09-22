import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";

//internal import
import StatCard from "@/components/dashboard/CStatCard";
import AnalyticsServices from "@/services/AnalyticsServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";

const CouponsAnalysis = ({ period, startDate, endDate }) => {
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

    AnalyticsServices.getCoupons(params)
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

  const metrics = data?.metrics || {};
  const topCoupons = data?.topCoupons || [];

  const statConfig = [
    { key: "couponsUsed", labelKey: "AnalyticsCouponsUsed", format: "number" },
    { key: "totalUsages", labelKey: "AnalyticsTotalUsages", format: "number" },
    { key: "totalDiscount", labelKey: "AnalyticsTotalDiscountAmount", format: "currency" },
  ];

  return (
    <Card className="mt-6">
      <CardBody>
        <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4">
          {t("AnalyticsCouponsSection")}
        </h3>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-6">
          {statConfig.map((config) => {
            const value = metrics[config.key]?.current ?? 0;
            const formatted =
              config.format === "currency" ? `${currency}${getNumberTwo(value)}` : value.toLocaleString();

            return (
              <StatCard
                key={config.key}
                title={t(config.labelKey)}
                value={formatted}
                loading={loading}
                titleClassName="text-xs"
                valueClassName="text-lg"
              />
            );
          })}
        </div>

        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">{t("AnalyticsTopCoupons")}</h4>

        {loading ? (
          <div className="h-32 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        ) : topCoupons.length === 0 ? (
          !error && <p className="text-sm text-gray-500">{t("AnalyticsNoCouponsData")}</p>
        ) : (
          <TableContainer className="rounded-lg">
            <Table>
              <TableHeader>
                <tr>
                  <TableCell>{t("AnalyticsCouponCodeCol")}</TableCell>
                  <TableCell>{t("AnalyticsUsagesCol")}</TableCell>
                  <TableCell>{t("AnalyticsTotalDiscountAmount")}</TableCell>
                </tr>
              </TableHeader>
              <TableBody>
                {topCoupons.map((coupon) => (
                  <TableRow key={coupon.couponId}>
                    <TableCell>{coupon.code}</TableCell>
                    <TableCell>{coupon.usages}</TableCell>
                    <TableCell>
                      {currency}
                      {getNumberTwo(coupon.totalDiscount || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardBody>
    </Card>
  );
};

export default CouponsAnalysis;
