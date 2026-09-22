import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pagination, Card, CardBody, Input, Select, Badge, Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import SortableDataTable from "@/components/tables/SortableDataTable";
import { FiDownload, FiEye, FiSearch } from "react-icons/fi";
import { CButton, ConfirmAction } from "@/components/ui";

import PageTitle from "@/components/Typography/PageTitle";
import useFilter from "@/hooks/useFilter";
import NotFound from "@/components/table/NotFound";
import auditAPI from "@/services/api/auditAPI";
import platformAPI from "@/services/api/platformAPI";
import useNotification from "@/hooks/useNotification";

const SEVERITY_BADGE = {
  low: { type: "gray", label: "Low" },
  medium: { type: "warning", label: "Medium" },
  high: { type: "info", label: "High" },
  critical: { type: "danger", label: "Critical" },
};

// AUDIT-4: a compact before/after diff instead of two raw JSON blobs â€” only

// keys that actually differ (or exist on either side) are shown.
const DiffView = ({ oldValue, newValue }) => {
  if (!oldValue && !newValue) return <p className="text-sm text-gray-500">No value change recorded.</p>;

  const keys = Array.from(new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})]));
  if (keys.length === 0) return <p className="text-sm text-gray-500">No value change recorded.</p>;

  return (
    <div className="grid grid-cols-1 gap-2">
      {keys.map((key) => {
        const before = oldValue?.[key];
        const after = newValue?.[key];
        const changed = JSON.stringify(before) !== JSON.stringify(after);
        return (
          <div
            key={key}
            className={`flex items-center justify-between text-sm px-3 py-2 rounded ${
              changed ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-gray-50 dark:bg-gray-700"
            }`}
          >
            <span className="font-medium text-gray-700 dark:text-gray-200 w-1/3 truncate">{key}</span>
            <span className="text-red-500 line-through w-1/3 truncate">
              {before === undefined ? "â€”" : String(before)}
            </span>
            <span className="text-green-600 w-1/3 truncate">{after === undefined ? "â€”" : String(after)}</span>

          </div>
        );
      })}
    </div>
  );
};

const AuditDetailModal = ({ log, onClose }) => {
  const { t } = useTranslation();
  if (!log) return null;

  return (
    <Modal isOpen={!!log} onClose={onClose}>
      <ModalBody className="px-6 py-6">
        <h3 className="text-lg font-semibold mb-4">{t("AuditDetail")}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="text-gray-500">{t("Actor")}</p>
            <p className="font-medium">{log.actorId?.name || log.actorId?.email || log.actorNameSnapshot || "â€”"}</p>
          </div>
          <div>
            <p className="text-gray-500">{t("Store")}</p>
            <p className="font-medium">{log.storeId?.name || "â€”"}</p>

          </div>
          <div>
            <p className="text-gray-500">{t("Action")}</p>
            <p className="font-medium">
              {log.module}.{log.action}
            </p>
          </div>
          <div>
            <p className="text-gray-500">{t("Entity")}</p>
            <p className="font-medium">
              {log.entityType || "â€”"} {log.entityId ? `#${log.entityId}` : ""}

            </p>
          </div>
          <div>
            <p className="text-gray-500">{t("Date")}</p>
            <p className="font-medium">{new Date(log.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">{t("IP")}</p>
            <p className="font-medium">{log.ip || log.ipAddress || "â€”"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500">{t("RequestId")}</p>
            <p className="font-mono text-xs">{log.requestId || "â€”"}</p>

          </div>
        </div>
        <h4 className="font-semibold mb-2">{t("Diff")}</h4>
        <DiffView oldValue={log.oldValue} newValue={log.newValue} />
      </ModalBody>
      <ModalFooter>
        <CButton variant="outline" onClick={onClose}>
          {t("Close")}
        </CButton>
      </ModalFooter>
    </Modal>
  );
};

const AuditLogsList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const { currentPage, handleChangePage, searchText, setSearchText } = useFilter();

  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [storeIdFilter, setStoreIdFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [exportJobStatus, setExportJobStatus] = useState(null); // null | "pending" | "processing" | "completed" | "failed"

  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "platformAuditLogs",
      currentPage,
      searchText,
      statusFilter,
      severityFilter,
      moduleFilter,
      actionFilter,
      storeIdFilter,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const res = await auditAPI.getAuditLogs({
        page: currentPage,
        limit: pageSize,
        search: searchText,
        status: statusFilter,
        severity: severityFilter,
        module: moduleFilter,
        action: actionFilter,
        storeId: storeIdFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      return res;
    },
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, pages: 1 };

  // Real options instead of free-text fields the caller had to guess an
  // exact value for: the stats endpoint already aggregates every action
  // actually recorded (AuditService.getStats -> byAction), and stores come
  // from the same platform stores list used elsewhere in the admin.
  const { data: statsData } = useQuery({
    queryKey: ["platformAuditLogStats"],
    queryFn: () => auditAPI.getAuditStats(),
    staleTime: 5 * 60 * 1000,
  });
  const actionOptions = Object.keys(statsData?.data?.byAction || statsData?.byAction || {}).sort();

  const { data: storesData } = useQuery({
    queryKey: ["platformStoresForAuditFilter"],
    queryFn: () => platformAPI.getAllStores(),
    staleTime: 5 * 60 * 1000,
  });
  const storeOptions = storesData?.data || [];

  const handleExport = async (format) => {
    try {
      const res = await auditAPI.exportAuditLogs({
        format,
        search: searchText,
        module: moduleFilter,
        action: actionFilter,
        storeId: storeIdFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const isCsv = format === "csv";
      const blob = isCsv
        ? new Blob([res.data ?? res], { type: "text/csv" })
        : new Blob([JSON.stringify(res.data ?? res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.${isCsv ? "csv" : "json"}`;
      a.click();
      URL.revokeObjectURL(url);
      successMessage(t("ExportSuccess"));
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message);
    }
  };

  // AUDIT-EXPORT-1: for large result sets â€” the file is generated in the

  // background (no HTTP request held open), we just poll until it's ready.
  const handleAsyncExport = async (format) => {
    try {
      setExportJobStatus("pending");
      const res = await auditAPI.requestAsyncExport({
        format,
        search: searchText,
        module: moduleFilter,
        action: actionFilter,
        storeId: storeIdFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const jobId = res.data.jobId;
      successMessage(t("ExportStarted"));

      const poll = async () => {
        const statusRes = await auditAPI.getExportStatus(jobId);
        const job = statusRes.data;
        setExportJobStatus(job.status);

        if (job.status === "completed") {
          const blob = await auditAPI.downloadExport(jobId);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = job.fileName || `audit-export.${format}`;
          a.click();
          URL.revokeObjectURL(url);
          successMessage(t("ExportSuccess"));
          setExportJobStatus(null);
          return;
        }
        if (job.status === "failed") {
          errorMessage(job.error || t("ExportFailed"));
          setExportJobStatus(null);
          return;
        }
        setTimeout(poll, 2000);
      };
      poll();
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message);
      setExportJobStatus(null);
    }
  };

  const handleCleanup = async () => {
    try {
      await auditAPI.cleanupOldLogs(730);
      successMessage(t("CleanupSuccess"));
      queryClient.invalidateQueries(["platformAuditLogs"]);
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message);
    }
  };

  const getSeverityBadge = (severity) => {
    const cfg = SEVERITY_BADGE[severity] || SEVERITY_BADGE.low;
    return <Badge type={cfg.type}>{cfg.label}</Badge>;
  };

  return (
    <div className="mx-auto w-full">
      <PageTitle>Audit Logs</PageTitle>


      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-4">
        <CardBody className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <FiSearch className="absolute right-[10px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              <Input
                type="text"
                placeholder={t("SearchPlaceholder")}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="!pl-3 !pr-9"
              />
            </div>
            <Input
              placeholder={t("Module")}
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            />
            <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">{t("AllActions") || "All actions"}</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </Select>
            <Select value={storeIdFilter} onChange={(e) => setStoreIdFilter(e.target.value)}>
              <option value="">{t("AllStores") || "All stores"}</option>
              {storeOptions.map((store) => (
                <option key={store._id || store.id} value={store._id || store.id}>
                  {store.name}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t("AllStatus")}</option>
              <option value="success">{t("Success")}</option>
              <option value="failed">{t("Failed")}</option>
            </Select>
            <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="">{t("AllSeverity")}</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label={t("StartDate")}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label={t("EndDate")}
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <CButton icon="download" onClick={() => handleExport("csv")}>
              {t("ExportCsv")}
            </CButton>
            <CButton variant="outline" icon="download" onClick={() => handleExport("json")}>
              {t("ExportJson")}
            </CButton>
            <CButton
              variant="outline"
              icon="download"
              disabled={!!exportJobStatus}
              loading={!!exportJobStatus}
              onClick={() => handleAsyncExport("csv")}
            >
              {exportJobStatus ? t(`ExportStatus_${exportJobStatus}`) : t("ExportLargeCsv")}
            </CButton>
            <ConfirmAction
              variant="outline"
              icon="trash"
              onConfirm={handleCleanup}
              title={t("Cleanup")}
              description={t("CleanupConfirm", { defaultValue: "This will delete old audit logs. Continue?" })}
              confirmText={t("Cleanup")}
              cancelText={t("CancelBtn")}
            >
              {t("Cleanup")}
            </ConfirmAction>
          </div>
        </CardBody>
      </Card>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
        <CardBody className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
            </div>
          ) : error ? (
            <NotFound title={t("ErrorLoadingLogs")} />
          ) : logs.length === 0 ? (
            <NotFound title={t("NoAuditLogsFound")} />
          ) : (
            <SortableDataTable
              columns={[
                { key: "createdAt", header: t("Date", { defaultValue: "Date" }), sortable: false },
                { key: "actorId", header: t("Actor", { defaultValue: "Actor" }), sortable: false },
                { key: "storeId", header: t("Store", { defaultValue: "Store" }), sortable: false },
                { key: "module", header: t("Module", { defaultValue: "Module" }), sortable: false },
                { key: "action", header: t("Action", { defaultValue: "Action" }), sortable: false },
                { key: "entityType", header: t("Entity", { defaultValue: "Entity" }), sortable: false },
                { key: "ip", header: t("IP", { defaultValue: "IP" }), sortable: false },
                { key: "status", header: t("Status", { defaultValue: "Status" }), sortable: false },
                { key: "severity", header: t("Severity", { defaultValue: "Severity" }), sortable: false },
              ]}
              rows={logs}
              getRowKey={(log) => log._id}
              onRowClick={(log) => setSelectedLog(log)}
              renderCell={({ row, column, value }) => {
                switch (column.key) {
                  case "createdAt":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{new Date(row.createdAt).toLocaleString()}</span>;
                  case "actorId":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.actorId?.name || row.actorId?.email || row.actorNameSnapshot || "â€”"}</span>;
                  case "storeId":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.storeId?.name || "â€”"}</span>;
                  case "module":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.module || "-"}</span>;
                  case "action":
                    return (
                      <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                        {row.action}
                      </code>
                    );
                  case "entityType":
                    return (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {row.entityType}
                        {row.entityId ? ` #${String(row.entityId).slice(-6)}` : ""}
                      </span>
                    );
                  case "ip":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.ip || row.ipAddress || "â€”"}</span>;
                  case "status":
                    return (
                      <Badge type={row.status === "success" ? "success" : "danger"}>{row.status}</Badge>
                    );
                  case "severity":
                    return (
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(row.severity)}
                        <FiEye className="text-gray-400" />
                      </div>
                    );
                  default:
                    return value;
                }
              }}
              pagination={{
                page: currentPage,
                total: pagination.total,
                limit: pageSize,
                onChange: handleChangePage,
              }}
            />

          )}
        </CardBody>
      </Card>

      <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};

export default AuditLogsList;
