import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Pagination } from "@windmill/react-ui";
import dayjs from "dayjs";
import { FiRefreshCw, FiPlus, FiZap, FiClock } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import UsageServices from "@/services/UsageServices";
import StoreServices from "@/services/StoreServices";
import QuotaTypeServices from "@/services/QuotaTypeServices";
import SubscriptionServices from "@/services/SubscriptionServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { Button } from "@sofia/ui";

const levelBadge = (level) => {
  const map = {
    normal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    critical: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    blocked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[level] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

const UsageTracking = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: "", level: "", quotaTypeCode: "", storeId: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 15;

  const [activeTab, setActiveTab] = useState("counters");
  const [inc, setInc] = useState({ storeId: "", quotaTypeCode: "", delta: 1, source: "manual", reason: "" });
  const [historyFilter, setHistoryFilter] = useState({ storeId: "", quotaTypeCode: "" });

  const canView = hasPermission("platform_plan", "view") || hasPermission("platform", "view");
  const canEdit = hasPermission("platform_plan", "update") || hasPermission("platform", "manage");

  const { data: storesData } = useQuery({
    queryKey: ["stores-list-usage"],
    queryFn: () => StoreServices.getAllStores({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });
  const stores = storesData?.data || [];

  const { data: quotaData } = useQuery({
    queryKey: ["quota-types-list-usage"],
    queryFn: () => QuotaTypeServices.getAllQuotaTypes({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });
  const quotaTypes = quotaData?.data || [];

  const { data: subsData } = useQuery({
    queryKey: ["subscriptions-list-usage"],
    queryFn: () => SubscriptionServices.getAllSubscriptions({ status: "active", limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const subscriptions = subsData?.data || [];

  const { data: summaryData } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: () => UsageServices.getSummary(),
    staleTime: 60 * 1000,
  });
  const summary = summaryData?.data || {};

  const { data: countersData, isLoading, error, refetch } = useQuery({
    queryKey: ["usage-counters", filters, currentPage],
    queryFn: () =>
      UsageServices.getCounters({
        page: currentPage,
        limit: pageSize,
        storeId: filters.storeId,
        quotaTypeCode: filters.quotaTypeCode,
        status: filters.level,
      }),
  });
  const counters = countersData?.data || [];
  const countersPagination = countersData?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ["usage-history", historyFilter, historyPage],
    queryFn: () =>
      UsageServices.getHistory({
        page: historyPage,
        limit: pageSize,
        storeId: historyFilter.storeId,
        quotaTypeCode: historyFilter.quotaTypeCode,
      }),
  });
  const history = historyData?.data || [];
  const historyPagination = historyData?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  const stats = [
    { label: t("TotalCounters") || "Total Counters", value: summary.total || 0 },
    { label: t("Normal") || "Normal", value: summary.normal || 0 },
    { label: t("Warning") || "Warning", value: summary.warning || 0 },
    { label: t("Critical") || "Critical", value: summary.critical || 0 },
    { label: t("Blocked") || "Blocked", value: summary.blocked || 0 },
    { label: t("StoresWithUsage") || "Stores w/ Usage", value: summary.storesWithUsage || 0 },
  ];

  const incMutation = useMutation({
    mutationFn: () => UsageServices.increment(inc),
    onSuccess: () => {
      successMessage(t("UsageIncremented") || "Usage incremented");
      queryClient.invalidateQueries(["usage-counters"]);
      queryClient.invalidateQueries(["usage-summary"]);
      queryClient.invalidateQueries(["usage-history"]);
      setInc({ storeId: "", quotaTypeCode: "", delta: 1, source: "manual", reason: "" });
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Increment failed"),
  });

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({ search: "", level: "", quotaTypeCode: "", storeId: "" });
    setCurrentPage(1);
  };

  const countersColumns = [
    { key: "store", header: t("Store") || "Store" },
    { key: "quota", header: t("QuotaType") || "Quota Type" },
    { key: "used", header: t("Used") || "Used" },
    { key: "included", header: t("Included") || "Included" },
    { key: "level", header: t("Level") || "Level" },
    { key: "period", header: t("Period") || "Period" },
  ];

  const renderCounterCell = ({ row, column }) => {
    switch (column.key) {
      case "store":
        return <span className="text-sm">{row.storeId?.name || row.storeId || "-"}</span>;
      case "quota":
        return <span className="text-sm font-medium">{row.quotaTypeCode}</span>;
      case "used":
        return <span className="text-sm font-semibold">{row.used}</span>;
      case "included":
        return <span className="text-sm">{row.included ?? "-"}</span>;
      case "level":
        return <Badge className={levelBadge(row.softLimitLevel)}>{row.softLimitLevel}</Badge>;
      case "period":
        return (
          <span className="text-xs text-gray-500">
            {dayjs(row.periodStart).format("DD/MM/YYYY")} â†’ {dayjs(row.periodEnd).format("DD/MM/YYYY")}
          </span>
        );
      default:
        return row[column.key];
    }
  };

  const historyColumns = [
    { key: "quota", header: t("QuotaType") || "Quota Type" },
    { key: "delta", header: t("Delta") || "Delta" },
    { key: "source", header: t("Source") || "Source" },
    { key: "reason", header: t("Reason") || "Reason" },
    { key: "store", header: t("Store") || "Store" },
    { key: "when", header: t("When") || "When" },
  ];

  const renderHistoryCell = ({ row, column }) => {
    switch (column.key) {
      case "quota":
        return <span className="text-sm font-medium">{row.quotaTypeCode}</span>;
      case "delta":
        return <span className={`text-sm font-semibold ${row.delta >= 0 ? "text-green-600" : "text-red-600"}`}>{row.delta > 0 ? `+${row.delta}` : row.delta}</span>;
      case "source":
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{row.source}</Badge>;
      case "reason":
        return <span className="text-sm">{row.reason || "-"}</span>;
      case "store":
        return <span className="text-sm">{row.storeId?.name || row.storeId || "-"}</span>;
      case "when":
        return <span className="text-xs text-gray-500">{dayjs(row.createdAt).format("DD/MM/YYYY HH:mm")}</span>;
      default:
        return row[column.key];
    }
  };

  if (!canView) {
    return (
      <div className="p-6">
        <PageTitle>{t("AccessDenied") || "Access Denied"}</PageTitle>
      </div>
    );
  }

  return (
    <>
      <PageTitle>{t("UsageTracking") || "Usage Tracking"}</PageTitle>

      <AnimatedContent>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {stats.map((s, i) => (
            <Card key={i} className="bg-white dark:bg-gray-800">
              <CardBody>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button onClick={() => setActiveTab("counters")} className={activeTab === "counters" ? "" : "opacity-70"}><FiZap className="mr-2" />{t("Counters") || "Counters"}</Button>
          <Button onClick={() => setActiveTab("history")} className={activeTab === "history" ? "" : "opacity-70"}><FiClock className="mr-2" />{t("History") || "History"}</Button>
          {canEdit && <Button onClick={() => setActiveTab("increment")} className={activeTab === "increment" ? "" : "opacity-70"}><FiPlus className="mr-2" />{t("Increment") || "Increment"}</Button>}
        </div>

        {activeTab === "counters" && (
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("Store") || "Store"}</label>
                  <select value={filters.storeId} onChange={(e) => handleFilterChange("storeId", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option value="">{t("AllStores") || "All stores"}</option>
                    {stores.map((s) => (
                      <option key={s._id} value={s._id}>{s.name || s._id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("QuotaType") || "Quota Type"}</label>
                  <select value={filters.quotaTypeCode} onChange={(e) => handleFilterChange("quotaTypeCode", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option value="">{t("AllQuotaTypes") || "All quota types"}</option>
                    {quotaTypes.map((q) => (
                      <option key={q._id} value={q.code}>{q.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("Level") || "Level"}</label>
                  <select value={filters.level} onChange={(e) => handleFilterChange("level", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option value="">{t("AllLevels") || "All levels"}</option>
                    {["normal", "warning", "critical", "blocked"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={() => refetch()} className="h-10"><FiRefreshCw className="mr-2" />{t("Refresh") || "Refresh"}</Button>
                  <Button layout="outline" onClick={handleReset} className="h-10">{t("Reset") || "Reset"}</Button>
                </div>
              </div>

              {isLoading ? (
                <TableLoading row={8} col={6} width={130} height={20} />
              ) : error ? (
                <p className="px-4 py-10 text-center text-sm text-red-500">{error?.response?.data?.message || error?.message || String(error)}</p>
              ) : counters.length > 0 ? (
                <>
                  <DataTable columns={countersColumns} rows={counters} getRowKey={(row) => row._id} tableClassName="min-w-full" cellClassName="px-4 py-3" renderCell={renderCounterCell} />
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t("Showing") || "Showing"} {counters.length} {t("Of") || "of"} {countersPagination.total}</span>
                    {countersPagination.pages > 1 && <Pagination totalResults={countersPagination.total || 0} resultsPerPage={pageSize} onChange={(page) => setCurrentPage(page + 1)} label="Table navigation" />}
                  </div>
                </>
              ) : (
                <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("NoCounters") || "No usage counters found."}</p>
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === "history" && (
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("Store") || "Store"}</label>
                  <select value={historyFilter.storeId} onChange={(e) => { setHistoryFilter((p) => ({ ...p, storeId: e.target.value })); setHistoryPage(1); }} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option value="">{t("AllStores") || "All stores"}</option>
                    {stores.map((s) => (
                      <option key={s._id} value={s._id}>{s.name || s._id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("QuotaType") || "Quota Type"}</label>
                  <select value={historyFilter.quotaTypeCode} onChange={(e) => { setHistoryFilter((p) => ({ ...p, quotaTypeCode: e.target.value })); setHistoryPage(1); }} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option value="">{t("AllQuotaTypes") || "All quota types"}</option>
                    {quotaTypes.map((q) => (
                      <option key={q._id} value={q.code}>{q.code}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => refetchHistory()} className="h-10"><FiRefreshCw className="mr-2" />{t("Refresh") || "Refresh"}</Button>
                </div>
              </div>

              {history.length > 0 ? (
                <>
                  <DataTable columns={historyColumns} rows={history} getRowKey={(row) => row._id} tableClassName="min-w-full" cellClassName="px-4 py-3" renderCell={renderHistoryCell} />
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t("Showing") || "Showing"} {history.length} {t("Of") || "of"} {historyPagination.total}</span>
                    {historyPagination.pages > 1 && <Pagination totalResults={historyPagination.total || 0} resultsPerPage={pageSize} onChange={(page) => setHistoryPage(page + 1)} label="Table navigation" />}
                  </div>
                </>
              ) : (
                <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("NoHistory") || "No usage history found."}</p>
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === "increment" && (
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <h3 className="text-lg font-semibold mb-1"><FiPlus className="inline mr-2 text-indigo-500" />{t("IncrementUsage") || "Increment Usage"}</h3>
              <p className="text-sm text-gray-500 mb-4">{t("IncrementSubtitle") || "Manually adjust a store's usage counter for a quota type."}</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("Store") || "Store"} *</label>
                  <select value={inc.storeId} onChange={(e) => setInc((p) => ({ ...p, storeId: e.target.value }))} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option value="">{t("SelectStore") || "Select store..."}</option>
                    {stores.map((s) => (
                      <option key={s._id} value={s._id}>{s.name || s._id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("QuotaType") || "Quota Type"} *</label>
                  <select value={inc.quotaTypeCode} onChange={(e) => setInc((p) => ({ ...p, quotaTypeCode: e.target.value }))} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option value="">{t("SelectQuotaType") || "Select quota type..."}</option>
                    {quotaTypes.map((q) => (
                      <option key={q._id} value={q.code}>{q.code} â€” {q.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("Delta") || "Delta"}</label>
                  <Input type="number" value={inc.delta} onChange={(e) => setInc((p) => ({ ...p, delta: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("Source") || "Source"}</label>
                  <select value={inc.source} onChange={(e) => setInc((p) => ({ ...p, source: e.target.value }))} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    {["manual", "order", "product", "customer", "api", "storage", "correction", "other"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Reason") || "Reason"}</label>
                <Input value={inc.reason} onChange={(e) => setInc((p) => ({ ...p, reason: e.target.value }))} placeholder="Optional reason" />
              </div>
              <Button onClick={() => incMutation.mutate()} disabled={!inc.storeId || !inc.quotaTypeCode || incMutation.isLoading}>
                <FiZap className="mr-2" />{incMutation.isLoading ? (t("Saving") || "Saving...") : (t("Increment") || "Increment")}
              </Button>
            </CardBody>
          </Card>
        )}
      </AnimatedContent>
    </>
  );
};

export default UsageTracking;
