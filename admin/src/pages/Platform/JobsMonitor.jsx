import { useEffect, useState, useCallback } from "react";
import { Card, CardBody } from "@windmill/react-ui";
import { FiActivity } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import requests from "@/services/httpService";
import { notifyError } from "@/utils/toast";
import SortableDataTable from "@/components/tables/SortableDataTable";
import { CButton } from "@/components/ui";
import { DEFAULT_PAGE_SIZE_OPTIONS } from "@/config/tableConfig";

const STATUS_BADGE = {
  failed: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  error: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  running: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  queued: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  retrying: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
};

const JobsMonitor = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (statusFilter) {
        const apiStatus = statusFilter === "completed" ? "success" : statusFilter;
        params.status = apiStatus;
      }
      const data = await requests.get("/v1/platform/logs/jobs", params);
      const result = data?.logs || data?.items || data?.data || [];
      setRows(result);
      setTotal(data?.total || result.length || 0);
    } catch (e) {
      notifyError(t("UnableToLoadJobLogs"), { message: e?.response?.data?.message });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const FILTERS = [
    { key: "", labelKey: "AnyJobForThisFilter" },
    { key: "completed", labelKey: "Completed" },
    { key: "failed", labelKey: "Failed" },
    { key: "running", labelKey: "Running" },
    { key: "queued", labelKey: "Queued" },
    { key: "retrying", labelKey: "Retrying" },
  ];

  return (
    <div className="mx-auto w-full pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <FiActivity size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-700 dark:text-gray-300">{t("JobsMonitor")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("JobsMonitorSubtitle")}</p>
          </div>
        </div>
        <CButton type="button" icon="refresh" onClick={load} loading={loading}>
          {t("Refresh")}
        </CButton>
      </div>

      <Card className="shadow-xs bg-white dark:bg-gray-800 mb-5">
        <CardBody className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map(({ key, labelKey }) => {
              const isActive = statusFilter === key;
              return (
                <CButton
                  key={key || "all"}
                  size="sm"
                  variant={isActive ? "primary" : "outline"}
                  onClick={() => { setStatusFilter(key); setPage(1); }}
                >
                  {t(labelKey)}
                </CButton>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-xs bg-white dark:bg-gray-800">
        <CardBody className="p-0">
          <SortableDataTable
            columns={[
              { key: "jobName", header: t("Job"), sortable: false },
              { key: "status", header: t("Status"), sortable: false },
              { key: "startedAt", header: t("StartedAt"), sortable: false },
              { key: "duration", header: t("Duration"), sortable: false },
              { key: "error", header: t("Error"), sortable: false },
            ]}
            rows={rows}
            loading={loading}
            loadingRows={5}
            getRowKey={(row) => row._id || row.id}
            emptyState={
              <span className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("AnyJobForThisFilter")}
              </span>
            }
            renderCell={({ row, column }) => {
              const started = row.startedAt || row.createdAt;
              const duration =
                row.durationMs != null
                  ? `${row.durationMs} ms`
                  : row.finishedAt && started
                  ? `${Math.max(0, Math.round((new Date(row.finishedAt) - new Date(started)) / 1000))} s`
                  : "—";
              switch (column.key) {
                case "jobName":
                  return (
                    <span className="font-mono text-xs font-medium text-gray-900 dark:text-white">
                      {row.jobName || row.name || row.type || "job"}
                    </span>
                  );
                case "status":
                  return (
                    <span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                          STATUS_BADGE[row.status] ||
                          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </span>
                  );
                case "startedAt":
                  return (
                    <span className="whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {new Date(started || Date.now()).toLocaleString()}
                    </span>
                  );
                case "duration":
                  return (
                    <span className="whitespace-nowrap text-gray-600 dark:text-gray-300">{duration}</span>
                  );
                case "error":
                  return (
                    <span className="max-w-[320px] truncate text-xs text-red-600 dark:text-red-400">
                      {row.error || "—"}
                    </span>
                  );
                default:
                  return row[column.key];
              }
            }}
            rowClassName={() => "bg-white dark:bg-gray-900"}
            pagination={{
              page,
              total,
              limit: pageSize,
              onChange: (newPage) => setPage(newPage),
              onLimitChange: (newSize) => { setPageSize(newSize); setPage(1); },
            }}
            pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
          />
        </CardBody>
      </Card>

      <div className="mt-4 flex items-center gap-2">
        <span className="self-center text-xs text-gray-400">
          {t("JobsPageNavigation", { page, totalPages: Math.max(1, Math.ceil(total / pageSize)) })}
        </span>

      </div>
    </div>
  );
};

export default JobsMonitor;
