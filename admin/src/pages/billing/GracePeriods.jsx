import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Pagination, Select } from "@windmill/react-ui";
import dayjs from "dayjs";
import { FiRefreshCw, FiCheck, FiAlertTriangle, FiX, FiEye } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import GracePeriodServices from "@/services/GracePeriodServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { Button } from "@sofia/ui";

const statusBadge = (status) => {
  const map = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    resolved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    escalated: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  };
  return map[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

const GracePeriods = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ status: "", storeId: "", subscriptionId: "", quotaTypeCode: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const canEdit = hasPermission("platform_plan", "update") || hasPermission("platform", "manage");

  const { data: storesData } = useQuery({
    queryKey: ["stores-list-grace"],
    queryFn: () => GracePeriodServices.getGracePeriods({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: graceData, isLoading, error, refetch } = useQuery({
    queryKey: ["grace-periods", filters, currentPage],
    queryFn: () =>
      GracePeriodServices.getGracePeriods({
        page: currentPage,
        limit: pageSize,
        status: filters.status,
        storeId: filters.storeId,
        subscriptionId: filters.subscriptionId,
        quotaTypeCode: filters.quotaTypeCode,
      }),
  });

  const gracePeriods = graceData?.data || [];
  const pagination = graceData?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolutionNote }) => GracePeriodServices.resolveGracePeriod(id, resolutionNote),
    onSuccess: () => {
      successMessage(t("GracePeriodResolved") || "Grace period resolved");
      queryClient.invalidateQueries(["grace-periods"]);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Resolution failed"),
  });

  const escalateMutation = useMutation({
    mutationFn: (id) => GracePeriodServices.escalateGracePeriod(id),
    onSuccess: () => {
      successMessage(t("GracePeriodEscalated") || "Grace period escalated");
      queryClient.invalidateQueries(["grace-periods"]);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Escalation failed"),
  });

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({ status: "", storeId: "", subscriptionId: "", quotaTypeCode: "" });
    setCurrentPage(1);
  };

  const columns = [
    { key: "store", header: t("Store") || "Store" },
    { key: "quota", header: t("QuotaType") || "Quota Type" },
    { key: "status", header: t("Status") || "Status" },
    { key: "gracePeriod", header: t("GracePeriod") || "Grace Period" },
    { key: "reason", header: t("Reason") || "Reason" },
    { key: "actions", header: "" },
  ];

  const renderCell = ({ row, column }) => {
    switch (column.key) {
      case "store":
        return <span className="text-sm font-medium">{row.storeId?.name || row.storeId || "-"}</span>;
      case "quota":
        return <span className="text-sm">{row.quotaTypeCode}</span>;
      case "status":
        return <Badge className={statusBadge(row.status)}>{row.status}</Badge>;
      case "gracePeriod":
        return (
          <span className="text-xs text-gray-500">
            {dayjs(row.graceStartDate).format("DD/MM/YYYY")} â†’ {dayjs(row.graceEndDate).format("DD/MM/YYYY")}
          </span>
        );
      case "reason":
        return <span className="text-sm">{row.reason || "-"}</span>;
      case "actions":
        return (
          <div className="flex gap-2">
            {canEdit && row.status === "active" && (
              <>
                <Button
                  layout="outline"
                  size="small"
                  onClick={() => resolveMutation.mutate({ id: row._id, resolutionNote: "Resolved by admin" })}
                  disabled={resolveMutation.isLoading}
                >
                  <FiCheck className="mr-1" />{t("Resolve") || "Resolve"}
                </Button>
                <Button
                  layout="outline"
                  size="small"
                  onClick={() => escalateMutation.mutate(row._id)}
                  disabled={escalateMutation.isLoading}
                >
                  <FiAlertTriangle className="mr-1" />{t("Escalate") || "Escalate"}
                </Button>
              </>
            )}
          </div>
        );
      default:
        return row[column.key];
    }
  };

  if (!hasPermission("platform_plan", "view")) {
    return (
      <div className="p-6">
        <PageTitle>{t("AccessDenied") || "Access Denied"}</PageTitle>
      </div>
    );
  }

  return (
    <>
      <PageTitle>{t("GracePeriods") || "Grace Periods"}</PageTitle>

      <AnimatedContent>
        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Status") || "Status"}</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllStatuses") || "All statuses"}</option>
                  <option value="active">{t("Active") || "Active"}</option>
                  <option value="expired">{t("Expired") || "Expired"}</option>
                  <option value="resolved">{t("Resolved") || "Resolved"}</option>
                  <option value="escalated">{t("Escalated") || "Escalated"}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("QuotaType") || "Quota Type"}</label>
                <Input
                  value={filters.quotaTypeCode}
                  onChange={(e) => handleFilterChange("quotaTypeCode", e.target.value)}
                  placeholder={t("FilterByQuotaType") || "Filter by quota type..."}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => refetch()} className="h-10">
                  <FiRefreshCw className="mr-2" />{t("Refresh") || "Refresh"}
                </Button>
                <Button layout="outline" onClick={handleReset} className="h-10">
                  {t("Reset") || "Reset"}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <TableLoading row={8} col={6} width={130} height={20} />
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-red-500">{error?.response?.data?.message || error?.message || String(error)}</p>
            ) : gracePeriods.length > 0 ? (
              <>
                <DataTable columns={columns} rows={gracePeriods} getRowKey={(row) => row._id} tableClassName="min-w-full" cellClassName="px-4 py-3" renderCell={renderCell} />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t("Showing") || "Showing"} {gracePeriods.length} {t("Of") || "of"} {pagination.total}</span>
                  {pagination.pages > 1 && <Pagination totalResults={pagination.total || 0} resultsPerPage={pageSize} onChange={(page) => setCurrentPage(page + 1)} label="Table navigation" />}
                </div>
              </>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("NoGracePeriods") || "No grace periods found."}</p>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>
    </>
  );
};

export default GracePeriods;