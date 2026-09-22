import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";

//internal import
import StatCard from "@/components/dashboard/CStatCard";
import AnalyticsServices from "@/services/AnalyticsServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";

// Not tied to the period selector at all â€” inventory levels and recent
// restocking are a live snapshot, fetched once on mount, same convention as
// the out-of-stock/low-stock lists in the Products section (Phase 5).
const InventoryAnalysis = () => {
  const { t } = useTranslation();
  const { currency, getNumberTwo } = useUtilsFunction();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    AnalyticsServices.getInventory()
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
  }, [t]);

  const mostRestocked = data?.mostRestockedRecently || [];

  const statConfig = [
    { key: "totalStockUnits", labelKey: "AnalyticsTotalStockUnits", format: "number" },
    { key: "estimatedStockValue", labelKey: "AnalyticsEstimatedStockValue", format: "currency" },
    { key: "outOfStockCount", labelKey: "AnalyticsOutOfStock", format: "number" },
    { key: "lowStockCount", labelKey: "AnalyticsLowStock", format: "number" },
  ];

  return (
    <Card className="mt-6">
      <CardBody>
        <h3 className="font-semibold text-gray-800 dark:text-gray-300">
          {t("AnalyticsInventorySection")}
        </h3>
        <p className="text-xs text-gray-400 mb-4">{t("AnalyticsCurrentState")}</p>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6">
          {statConfig.map((config) => {
            const value = data?.[config.key] ?? 0;
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

        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">{t("AnalyticsMostRestocked")}</h4>

        {loading ? (
          <div className="h-32 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        ) : mostRestocked.length === 0 ? (
          !error && <p className="text-sm text-gray-500">{t("AnalyticsNoRestockedData")}</p>
        ) : (
          <TableContainer className="rounded-lg">
            <Table>
              <TableHeader>
                <tr>
                  <TableCell>{t("AnalyticsProductNameCol")}</TableCell>
                  <TableCell>{t("AnalyticsRestockedQuantityCol")}</TableCell>
                </tr>
              </TableHeader>
              <TableBody>
                {mostRestocked.map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell>{product.name || "â€”"}</TableCell>
                    <TableCell>{product.totalRestocked}</TableCell>
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

export default InventoryAnalysis;
