import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Pagination, Select, Input, Badge } from "@windmill/react-ui";
import SortableDataTable from "@/components/tables/SortableDataTable";

import {
  FiFileText,
  FiAlertTriangle,
  FiAlertOctagon,
  FiServer,
  FiLink,
  FiClock,
  FiShield,
  FiActivity,
} from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import KpiCard from "@/pages/Platform/superadmin/components/KpiCard";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import logsAPI from "@/services/api/logsAPI";
import useNotification from "@/hooks/useNotification";
import { CButton } from "@/components/ui";
import { Button } from "@sofia/ui";

const TABS = [
  { key: "system", label: "SystemLogs" },
  { key: "security", label: "SecurityLogs" },
  { key: "webhooks", label: "WebhookLogs" },
  { key: "jobs", label: "JobLogs" },
];

const LEVEL_BADGE = {
  debug: "gray",
  info: "info",
  warning: "warning",
  error: "danger",
  critical: "danger",
};

const PAGE_SIZE = 20;

const LogsDashboard = () => {
  const { t } = useTranslation();
  const { successMessage, errorMessage } = useNotification();
  const [period, setPeriod] = useState("today");
  const [activeTab, setActiveTab] = useState("system");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setPage(1);
    setSearch("");
    setLevel("");
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
    setPage(1);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["logsDashboardStats", period],
    queryFn: () => logsAPI.getDashboardStats({ period }),
  });

  const kpis = stats?.data || {};

  const { data: tableData, isLoading: tableLoading, error: tableError, refetch } = useQuery({
    queryKey: ["logsTable", activeTab, period, page, search, level],
    queryFn: async () => {
      const params = { period, page, limit: PAGE_SIZE, search: search || undefined };
      if (activeTab === "system") return logsAPI.getSystemLogs({ ...params, level: level || undefined });
      if (activeTab === "security") return logsAPI.getSecurityLogs(params);
      if (activeTab === "webhooks") return logsAPI.getWebhookLogs(params);
      if (activeTab === "jobs") return logsAPI.getJobLogs(params);
      return { data: [], total: 0 };
    },
  });

  const rows = tableData?.data || [];
  const totalResults = tableData?.total || 0;

  const handleRetry = async (id) => {
    try {
      await logsAPI.retryWebhook(id);
      successMessage(t("RetrySuccess"));
      refetch();
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message);
    }
  };

  return (
    <div className="mx-auto w-full">
      <PageTitle>{t("LogsMonitoring")}</PageTitle>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-4">
        <CardBody className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder={t("SearchPlaceholder")}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="lg:col-span-2"
            />
            {activeTab === "system" && (
              <Select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}>
                <option value="">{t("AllLevels")}</option>
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </Select>
            )}
            <Select value={period} onChange={(e) => handlePeriodChange(e.target.value)}>
              <option value="today">{t("Today")}</option>
              <option value="yesterday">{t("Yesterday")}</option>
              <option value="last7days">{t("Last7Days")}</option>
              <option value="last30days">{t("Last30Days")}</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        <KpiCard title={t("Total")} value={kpis.totalLogs || 0} icon={FiFileText} color="blue" loading={statsLoading} />
        <KpiCard title={t("Errors")} value={kpis.errors || 0} icon={FiAlertTriangle} color="orange" loading={statsLoading} />
        <KpiCard title={t("Critical")} value={kpis.criticalErrors || 0} icon={FiAlertOctagon} color="red" loading={statsLoading} />
        <KpiCard title={t("APIErrors")} value={kpis.apiErrors || 0} icon={FiServer} color="amber" loading={statsLoading} />
        <KpiCard title={t("Webhooks")} value={kpis.webhookFailures || 0} icon={FiLink} color="violet" loading={statsLoading} />
        <KpiCard title={t("FailedJobs")} value={kpis.failedJobs || 0} icon={FiClock} color="indigo" loading={statsLoading} />
        <KpiCard title={t("Security")} value={kpis.securityEvents || 0} icon={FiShield} color="cyan" loading={statsLoading} />
      </div>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
        <CardBody className="p-6">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 mb-4">
            {TABS.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t(tab.label)}
              </Button>
            ))}
          </div>

          {tableLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
            </div>
          ) : tableError ? (
            <NotFound title={t("ErrorLoadingLogs")} />
          ) : rows.length === 0 ? (
            <NotFound title={t("NoLogsFound")} />
          ) : activeTab === "system" ? (
            <SortableDataTable
              columns={[
                { key: "createdAt", header: t("Date"), sortable: false },
                { key: "level", header: t("Level"), sortable: false },
                { key: "category", header: t("Category"), sortable: false },
                { key: "message", header: t("Message"), sortable: false },
                { key: "requestId", header: t("RequestId"), sortable: false },
              ]}
              rows={rows}
              getRowKey={(row) => row._id}
              renderCell={({ row, column }) => {
                switch (column.key) {
                  case "createdAt":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{new Date(row.createdAt).toLocaleString()}</span>;
                  case "level":
                    return <Badge type={LEVEL_BADGE[row.level] || "gray"}>{row.level}</Badge>;
                  case "category":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.category}</span>;
                  case "message":
                    return <span className="text-sm text-gray-700 dark:text-gray-300 max-w-md truncate">{row.message}</span>;
                  case "requestId":
                    return <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">{row.requestId?.slice(0, 8) || "â€”"}</span>;

                  default:
                    return row[column.key];
                }
              }}
              pagination={{
                page,
                total: totalResults,
                limit: PAGE_SIZE,
                onChange: setPage,
              }}
            />
          ) : activeTab === "security" ? (
            <SortableDataTable
              columns={[
                { key: "createdAt", header: t("Date"), sortable: false },
                { key: "event", header: t("Event"), sortable: false },
                { key: "userId", header: t("User"), sortable: false },
                { key: "ip", header: t("IP"), sortable: false },
                { key: "severity", header: t("Severity"), sortable: false },
              ]}
              rows={rows}
              getRowKey={(row) => row._id}
              renderCell={({ row, column }) => {
                switch (column.key) {
                  case "createdAt":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{new Date(row.createdAt).toLocaleString()}</span>;
                  case "event":
                    return <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">{row.event}</code>;
                  case "userId":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.userId?.name || row.userId?.email || row.email || "â€”"}</span>;
                  case "ip":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.ip || "â€”"}</span>;

                  case "severity":
                    return <Badge type={row.severity === "high" || row.severity === "critical" ? "danger" : "gray"}>{row.severity}</Badge>;
                  default:
                    return row[column.key];
                }
              }}
              pagination={{
                page,
                total: totalResults,
                limit: PAGE_SIZE,
                onChange: setPage,
              }}
            />
          ) : activeTab === "webhooks" ? (
            <SortableDataTable
              columns={[
                { key: "createdAt", header: t("Date"), sortable: false },
                { key: "provider", header: t("Provider"), sortable: false },
                { key: "event", header: t("Event"), sortable: false },
                { key: "httpStatus", header: t("HttpStatus"), sortable: false },
                { key: "attempts", header: t("Attempts"), sortable: false },
                { key: "status", header: t("Status"), sortable: false },
                { key: "actions", header: t("Actions"), sortable: false },
              ]}
              rows={rows}
              getRowKey={(row) => row._id}
              renderCell={({ row, column }) => {
                switch (column.key) {
                  case "createdAt":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{new Date(row.createdAt).toLocaleString()}</span>;
                  case "provider":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.provider}</span>;
                  case "event":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.event}</span>;
                  case "httpStatus":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.httpStatus || "â€”"}</span>;

                  case "attempts":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.attempts}</span>;
                  case "status":
                    return <Badge type={row.status === "success" ? "success" : row.status === "failed" ? "danger" : "warning"}>{row.status}</Badge>;
                  case "actions":
                    return row.status === "failed" ? (
                      <CButton size="sm" icon="refresh" onClick={() => handleRetry(row._id)}>
                        {t("Retry")}
                      </CButton>
                    ) : null;
                  default:
                    return row[column.key];
                }
              }}
              pagination={{
                page,
                total: totalResults,
                limit: PAGE_SIZE,
                onChange: setPage,
              }}
            />
          ) : (
            <SortableDataTable
              columns={[
                { key: "jobName", header: t("Job"), sortable: false },
                { key: "status", header: t("Status"), sortable: false },
                { key: "attempts", header: t("Attempts"), sortable: false },
                { key: "duration", header: t("Duration"), sortable: false },
                { key: "error", header: t("Error"), sortable: false },
                { key: "startedAt", header: t("Started"), sortable: false },
              ]}
              rows={rows}
              getRowKey={(row) => row._id}
              renderCell={({ row, column }) => {
                switch (column.key) {
                  case "jobName":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.jobName}</span>;
                  case "status":
                    return <Badge type={row.status === "success" ? "success" : row.status === "failed" ? "danger" : "warning"}>{row.status}</Badge>;
                  case "attempts":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.attempts}</span>;
                  case "duration":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{row.durationMs ? `${row.durationMs}ms` : "â€”"}</span>;
                  case "error":
                    return <span className="text-sm max-w-xs truncate text-red-500">{row.error || "â€”"}</span>;

                  case "startedAt":
                    return <span className="text-sm text-gray-700 dark:text-gray-300">{new Date(row.startedAt).toLocaleString()}</span>;
                  default:
                    return row[column.key];
                }
              }}
              pagination={{
                page,
                total: totalResults,
                limit: PAGE_SIZE,
                onChange: setPage,
              }}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default LogsDashboard;
