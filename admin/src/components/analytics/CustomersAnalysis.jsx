import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

//internal import
import StatCard from "@/components/dashboard/CStatCard";
import AnalyticsServices from "@/services/AnalyticsServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";

// Same shape as the Phase 1 KPI cards: `invert: true` means a decrease is
// the good outcome (only "inactive customers" qualifies here).
const STAT_CONFIG = [
  { key: "newCustomers", labelKey: "AnalyticsNewCustomers", format: "number" },
  { key: "recurringCustomers", labelKey: "AnalyticsRecurringCustomers", format: "number" },
  { key: "totalActiveCustomers", labelKey: "AnalyticsActiveCustomers", format: "number" },
  { key: "inactiveCustomers", labelKey: "AnalyticsInactiveCustomers", format: "number", invert: true },
  { key: "customerLifetimeValue", labelKey: "AnalyticsCustomerLifetimeValue", format: "currency" },
  { key: "avgOrdersPerCustomer", labelKey: "AnalyticsAvgOrdersPerCustomer", format: "decimal" },
];

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

const CustomersAnalysis = ({ period, startDate, endDate }) => {
  const { t } = useTranslation();
  const { currency, getNumberTwo } = useUtilsFunction();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortColumn, setSortColumn] = useState("totalSpent");
  const [sortDirection, setSortDirection] = useState("desc");

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

    AnalyticsServices.getCustomers(params)
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

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (column) => {
    if (sortColumn !== column) {
      return (
        <span className="ml-1 inline-flex flex-col leading-none text-gray-400">
          <FiChevronUp className="-mb-0.5" size={12} />
          <FiChevronDown size={12} />
        </span>
      );
    }
    return sortDirection === "asc" ? (
      <FiChevronUp className="ml-1 text-emerald-600" size={14} />
    ) : (
      <FiChevronDown className="ml-1 text-emerald-600" size={14} />
    );
  };

  const metrics = data?.metrics || {};
  const topCustomers = data?.topCustomers || [];

  // Sorting only ever re-orders the same top-10 rows already returned by the
  // backend (sorted by period spend) â€” no refetch needed for a client-side
  // column sort.
  const sortedCustomers = [...topCustomers].sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    if (typeof aValue === "string" || typeof bValue === "string") {
      return direction * String(aValue || "").localeCompare(String(bValue || ""));
    }
    return direction * ((aValue || 0) - (bValue || 0));
  });

  const columns = [
    { column: "name", labelKey: "AnalyticsCustomerName" },
    { column: "email", labelKey: "AnalyticsCustomerEmail" },
    { column: "totalSpent", labelKey: "AnalyticsAmountSpent" },
    { column: "ordersCount", labelKey: "AnalyticsCustomerOrdersCount" },
  ];

  return (
    <Card className="mt-6">
      <CardBody>
        <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4">
          {t("AnalyticsCustomersAnalysis")}
        </h3>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6">
          {STAT_CONFIG.map((config) => {
            const metric = metrics[config.key];
            const changePercent = metric?.changePercent;
            const trend = buildTrend(changePercent, config.invert);
            // "decimal" (avg orders/customer) uses the same locale-independent
            // formatter as currency â€” plain toLocaleString() would follow the
            // browser/OS locale (e.g. "1,67") regardless of the app's EN/FR
            // language toggle, unlike every other value on this page.
            const value =
              config.format === "currency"
                ? `${currency}${getNumberTwo(metric?.current || 0)}`
                : config.format === "decimal"
                  ? getNumberTwo(metric?.current || 0)
                  : (metric?.current ?? 0).toLocaleString();

            return (
              <StatCard
                key={config.key}
                title={t(config.labelKey)}
                value={value}
                loading={loading}
                titleClassName="text-xs"
                valueClassName="text-lg"
                change={
                  <span className="inline-flex items-center gap-1">
                    {trend === "positive" && <FiChevronUp className="h-3 w-3" />}
                    {trend === "negative" && <FiChevronDown className="h-3 w-3" />}
                    {formatChange(changePercent, t)}
                  </span>
                }
                changeLabel={t("AnalyticsVsPreviousPeriod")}
                trend={trend}
              />
            );
          })}

          <StatCard
            title={t("AnalyticsCustomersToday")}
            value={loading ? "" : (data?.customersToday ?? 0).toLocaleString()}
            loading={loading}
            titleClassName="text-xs"
            valueClassName="text-lg"
          />
        </div>

        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {t("AnalyticsTopCustomers")}
        </h4>

        {loading ? (
          <div className="h-40 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        ) : sortedCustomers.length === 0 ? (
          !error && <p className="text-gray-500">{t("AnalyticsNoCustomersData")}</p>
        ) : (
          <TableContainer className="rounded-lg">
            <Table>
              <TableHeader>
                <tr>
                  {columns.map(({ column, labelKey }) => (
                    <TableCell
                      key={column}
                      className="cursor-pointer select-none"
                      onClick={() => handleSort(column)}
                    >
                      <span className="flex items-center">
                        {t(labelKey)}
                        {renderSortIcon(column)}
                      </span>
                    </TableCell>
                  ))}
                </tr>
              </TableHeader>
              <TableBody>
                {sortedCustomers.map((customer) => (
                  <TableRow key={customer.customerId}>
                    <TableCell>{customer.name || "â€”"}</TableCell>
                    <TableCell>{customer.email || "â€”"}</TableCell>
                    <TableCell>
                      {currency}
                      {getNumberTwo(customer.totalSpent || 0)}
                    </TableCell>
                    <TableCell>{customer.ordersCount}</TableCell>
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

export default CustomersAnalysis;
