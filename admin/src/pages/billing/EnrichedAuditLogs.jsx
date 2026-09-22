import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Pagination } from "@windmill/react-ui";
import { AppDrawer } from "@/components/ui";
import dayjs from "dayjs";
import { FiRefreshCw, FiDownload, FiEye } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import PlanAuditLogServices from "@/services/PlanAuditLogServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { IconButton } from "@/components/ui";
import { Button } from "@sofia/ui";


const severityBadge = (severity) => {
  const map = {
    low: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[severity] || map.low;
};

const statusBadge = (status) => {
  const map = {
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[status] || map.success;
};

const actionBadge = (action) => {
  const map = {
    create: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    update: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    clone: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    activate: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    deactivate: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    archive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    rollback: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    visibility_change: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    pricing_change: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    feature_change: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    quota_change: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300",
    bulk_update: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",
  };
  return map[action] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

const DiffView = ({ before, after }) => {
  const { t } = useTranslation();
  const keys = useMemo(() => {
    const set = new Set();
    if (before && typeof before === "object") Object.keys(before).forEach((k) => set.add(k));
    if (after && typeof after === "object") Object.keys(after).forEach((k) => set.add(k));
    return Array.from(set);
  }, [before, after]);

  if (keys.length === 0) {
    return <p className="text-sm text-gray-500">{t("NoChanges") || "No field-level changes recorded."}</p>;
  }

  const renderValue = (v) => {
    if (v === null || v === undefined) return "â€”";

    if (typeof v === "object") return <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(v, null, 2)}</pre>;
    return String(v);
  };

  return (
    <div className="space-y-2">
      {keys.map((key) => {
        const oldVal = before?.[key];
        const newVal = after?.[key];
        const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
        return (
          <div
            key={key}
            className={`rounded border p-3 ${changed ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700" : "border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                {key}
              </span>
              {changed && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                  {t("Changed") || "CHANGED"}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-red-50 dark:bg-red-900/20 p-2">
                <p className="font-medium text-red-700 dark:text-red-300 mb-1">{t("Before") || "Before"}</p>
                {renderValue(oldVal)}
              </div>
              <div className="rounded bg-green-50 dark:bg-green-900/20 p-2">
                <p className="font-medium text-green-700 dark:text-green-300 mb-1">{t("After") || "After"}</p>
                {renderValue(newVal)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const EnrichedAuditLogs = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();

  const [planId, setPlanId] = useState("");
  const [filters, setFilters] = useState({
    action: "",
    severity: "",
    status: "",
    search: "",
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const pageSize = 15;

// Permission backend: platform_plan_view (route GET /billing/plans/:id/audit-log)
  const canView = hasPermission("platform_plan", "view") || hasPermission("platform", "view");

  const { data: plansData } = useQuery({
    queryKey: ["plans-active-list"],
    queryFn: () => PlanAuditLogServices.getActivePlans(),
    staleTime: 5 * 60 * 1000,
  });
  const plans = plansData?.data || [];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["plan-audit-logs-enriched", planId, filters, currentPage],
    queryFn: async () => {
      if (!planId) return { data: [], summary: { byAction: [], bySeverity: [] }, pagination: { total: 0, page: 1, limit: pageSize, pages: 0 } };
      return PlanAuditLogServices.getPlanAuditLogs(planId, {
        page: currentPage,
        limit: pageSize,
        action: filters.action,
        severity: filters.severity,
        status: filters.status,
        search: filters.search,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sort: "-createdAt",
      });
    },
    enabled: !!planId,
  });

  const logs = data?.data || [];
  const summary = data?.summary || { byAction: [], bySeverity: [] };
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setPlanId("");
    setFilters({ action: "", severity: "", status: "", search: "", startDate: "", endDate: "" });
    setCurrentPage(1);
    setSelectedLog(null);
  };

  const handleExport = () => {
    if (!planId) {
      errorMessage(t("SelectPlanFirst") || "Select a plan first");
      return;
    }
    try {
      const blob = new Blob([PlanAuditLogServices.toJson(logs)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plan-audit-logs-${planId}-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      successMessage(t("ExportSuccess") || "Export successful");
    } catch (err) {
      errorMessage(err?.message || "Export failed");
    }
  };

  const columns = [
    { key: "createdAt", header: t("Timestamp") || "Timestamp" },
    { key: "action", header: t("Action") || "Action" },
    { key: "actor", header: t("Actor") || "Actor" },
    { key: "severity", header: t("Severity") || "Severity" },
    { key: "status", header: t("Status") || "Status" },
    { key: "version", header: t("Version") || "Version" },
    { key: "ip", header: t("IP") || "IP" },
    { key: "summary", header: t("Summary") || "Summary" },
    { key: "actions", header: "" },
  ];

  const renderCell = ({ row, column }) => {
    switch (column.key) {
      case "createdAt":
        return <span className="text-xs">{dayjs(row.createdAt).format("DD/MM/YYYY HH:mm:ss")}</span>;
      case "action":
        return <Badge className={actionBadge(row.action)}>{row.action}</Badge>;
      case "actor":
        return <span className="text-sm">{row.userId?.name || row.userId?.email || "-"}</span>;
      case "severity":
        return <Badge className={severityBadge(row.severity)}>{row.severity}</Badge>;
      case "status":
        return <Badge className={statusBadge(row.status)}>{row.status}</Badge>;
      case "version":
        return row.version ? <span className="text-sm font-medium">v{row.version}</span> : <span className="text-sm text-gray-400">-</span>;
      case "ip":
        return <span className="text-xs">{row.ipAddress || row.sourceIp || "-"}</span>;
      case "summary":
        return <span className="text-sm line-clamp-2 max-w-[260px]">{row.summary || "-"}</span>;
      case "actions":
        return (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedLog(row)}
            className="flex items-center gap-1"
          >
            <FiEye /> {t("Details") || "Details"}
          </Button>
        );

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
      <PageTitle>{t("EnrichedAuditLogs") || "Enriched Audit Logs"}</PageTitle>

      <AnimatedContent>
        {/* Summary cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: t("Total") || "Total", value: pagination.total, cls: "text-gray-700 dark:text-gray-200" },
            { label: t("ByAction") || "Actions", value: summary.byAction?.length || 0, cls: "text-blue-600" },
            { label: t("HighSeverity") || "High+", value: summary.bySeverity?.filter((s) => ["high", "critical"].includes(s.severity)).reduce((a, s) => a + s.count, 0) || 0, cls: "text-orange-600" },
            { label: t("Plans") || "Plans", value: plans.length, cls: "text-emerald-600" },
          ].map((item) => (
            <Card key={item.label} className="bg-white dark:bg-gray-800">
              <CardBody>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${item.cls}`}>{item.value}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Plan") || "Plan"}</label>
                <select
                  value={planId}
                  onChange={(e) => {
                    setPlanId(e.target.value);
                    setCurrentPage(1);
                    setSelectedLog(null);
                  }}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("SelectPlan") || "Select a plan..."}</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (v{p.version || 1})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Action") || "Action"}</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange("action", e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllActions") || "All actions"}</option>
                  {["create", "update", "clone", "activate", "deactivate", "archive", "delete", "rollback", "visibility_change", "pricing_change", "feature_change", "quota_change", "bulk_update"].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Severity") || "Severity"}</label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange("severity", e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllSeverity") || "All severities"}</option>
                  {["low", "medium", "high", "critical"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Status") || "Status"}</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllStatus") || "All statuses"}</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Search") || "Search"}</label>
                <Input
                  placeholder={t("SearchSummary") || "Search summary / action"}
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("StartDate") || "Start Date"}</label>
                <Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("EndDate") || "End Date"}</label>
                <Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => refetch()} className="h-10 whitespace-nowrap">
                  <FiRefreshCw className="mr-2" /> {t("Refresh") || "Refresh"}
                </Button>
                <Button layout="outline" onClick={handleExport} className="h-10 whitespace-nowrap">
                  <FiDownload className="mr-2" /> {t("Export") || "Export"}
                </Button>
                <Button layout="outline" onClick={handleReset} className="h-10 whitespace-nowrap">
                  {t("Reset") || "Reset"}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{t("AuditLogList") || "Plan Audit Trail"}</h3>
              <p className="text-sm text-gray-500">
                {t("AuditLogListSubtitle") || "Before/After snapshots, actor, IP, severity & version for every change."}
              </p>
            </div>

            {!planId ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("SelectPlanToView") || "Select a plan to view its audit trail."}
              </p>
            ) : isLoading ? (
              <TableLoading row={10} col={8} width={130} height={20} />
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-red-500">
                {error?.response?.data?.message || error?.message || String(error)}
              </p>
            ) : logs.length > 0 ? (
              <>
                <DataTable
                  columns={columns}
                  rows={logs}
                  getRowKey={(row) => row._id}
                  tableClassName="min-w-full"
                  cellClassName="px-4 py-3"
                  renderCell={renderCell}
                />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {t("Showing") || "Showing"} {logs.length} {t("Of") || "of"} {pagination.total}
                  </span>
                  {pagination.pages > 1 && (
                    <Pagination
                      totalResults={pagination.total || 0}
                      resultsPerPage={pageSize}
                      onChange={(page) => setCurrentPage(page + 1)}
                      label="Table navigation"
                    />
                  )}
                </div>
              </>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("NoAuditLogs") || "No audit logs found."}
              </p>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>

      {/* Detail drawer with before/after diff */}
      <AppDrawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={t("AuditLogDetail") || "Audit Log Detail"}
        width="560px"
      >
        {selectedLog && (
          <>
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={actionBadge(selectedLog.action)}>{selectedLog.action}</Badge>
                <Badge className={severityBadge(selectedLog.severity)}>{selectedLog.severity}</Badge>
                <Badge className={statusBadge(selectedLog.status)}>{selectedLog.status}</Badge>
                {selectedLog.version && <Badge>v{selectedLog.version}</Badge>}
              </div>

              {selectedLog.summary && (
                <p className="text-gray-700 dark:text-gray-300">{selectedLog.summary}</p>
              )}

              <div className="rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">{t("Actor") || "Actor"}</p>
                    <p className="font-medium">{selectedLog.userId?.name || selectedLog.userId?.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("Timestamp") || "Timestamp"}</p>
                    <p className="font-medium">{dayjs(selectedLog.createdAt).format("DD/MM/YYYY HH:mm:ss")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("IP") || "IP"}</p>
                    <p className="font-medium">{selectedLog.ipAddress || selectedLog.sourceIp || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("Entity") || "Entity"}</p>
                    <p className="font-medium">{selectedLog.entityType || "plan"}</p>
                  </div>
                </div>
                {selectedLog.userAgent && (
                  <p className="mt-3 text-xs text-gray-500 break-words">{selectedLog.userAgent}</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">{t("FieldChanges") || "Field Changes (Before / After)"}</h4>
                <DiffView before={selectedLog.before} after={selectedLog.after} />
              </div>

              {selectedLog.fieldChanges && Object.keys(selectedLog.fieldChanges).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{t("LegacyChanges") || "Legacy fieldChanges"}</h4>
                    <pre className="whitespace-pre-wrap rounded bg-gray-50 dark:bg-gray-800 p-3 text-xs">
                      {JSON.stringify(selectedLog.fieldChanges, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{t("Metadata") || "Metadata"}</h4>
                    <pre className="whitespace-pre-wrap rounded bg-gray-50 dark:bg-gray-800 p-3 text-xs">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </>
          )}
      </AppDrawer>
    </>
  );
};

export default EnrichedAuditLogs;
