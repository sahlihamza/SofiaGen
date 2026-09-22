import { useEffect, useState } from "react";
import { Card, CardBody } from "@windmill/react-ui";
import { FiSearch, FiShield } from "react-icons/fi";
import requests from "@/services/httpService";
import { notifyError } from "@/utils/toast";
import SortableDataTable from "@/components/tables/SortableDataTable";
import { CButton } from "@/components/ui";

const SEVERITY_BADGE = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const SecurityCenter = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [impersonations, setImpersonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (period !== "all") params.startDate = new Date(Date.now() - Number(period.replace("d", "")) * 86400000).toISOString();
      if (search.trim()) params.search = search.trim();
      const auditParams = { ...params, action: "impersonate", limit: 25 };
      const [data, impersonationData] = await Promise.all([
        requests.get("/v1/platform/logs/security", params),
        requests.get("/v1/platform/audit-logs", auditParams).catch(() => null),
      ]);
      setRows(data?.logs || data?.items || data?.data || []);
      setImpersonations(
        (impersonationData?.logs || impersonationData?.data?.logs || []).filter((entry) =>
          String(entry.action || "").includes("impersonat")
        )
      );
    } catch (e) {
      notifyError(e?.response?.data?.message || t("SecurityLogsLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [period, page]);

  return (
    <div className="mx-auto w-full pb-10">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
            <FiShield size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-700 dark:text-gray-300">Security Center</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Failed logins, suspicious activity and security events across the platform.
            </p>
          </div>
        </div>
      </div>

      <Card className="shadow-xs bg-white dark:bg-gray-800 mb-5">
        <CardBody className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {[["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"], ["all", "All time"]].map(([key, label]) => {
              const active = period === key;
              return (
                <CButton
                  key={key}
                  size="sm"
                  variant={active ? "primary" : "outline"}
                  onClick={() => { setPeriod(key); setPage(1); }}
                >
                  {label}
                </CButton>
              );
            })}
            <div className="relative ml-auto">
              <FiSearch className="absolute right-[10px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
                placeholder="Search email / event / IP…"
                className="h-9 w-64 rounded-xl border border-gray-300 bg-white pl-3 pr-9 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <CButton
              type="button"
              size="sm"
              onClick={() => { setPage(1); load(); }}
              disabled={loading}
            >
              Search
            </CButton>
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-xs bg-white dark:bg-gray-800">
        <CardBody className="p-0">
          <SortableDataTable
            columns={[
              { key: "timestamp", header: "Timestamp", sortable: false },
              { key: "event", header: "Event", sortable: false },
              { key: "user", header: "User", sortable: false },
              { key: "ip", header: "IP", sortable: false },
              { key: "severity", header: "Severity", sortable: false },
              { key: "status", header: "Status", sortable: false },
            ]}
            rows={rows}
            loading={loading}
            loadingRows={8}
            getRowKey={(row) => row._id || row.id}
            renderCell={({ row, column }) => {
              switch (column.key) {
                case "timestamp":
                  return <span className="whitespace-nowrap">{new Date(row.createdAt || row.timestamp).toLocaleString()}</span>;
                case "event":
                  return <span className="font-mono text-xs font-medium text-gray-900 dark:text-white">{row.event || row.action || "—"}</span>;
                case "user":
                  return <span className="text-gray-600 dark:text-gray-300">{row.email || row.userId?.email || row.actorNameSnapshot || "—"}</span>;
                case "ip":
                  return <span className="font-mono text-xs text-gray-500">{row.ip || row.sourceIp || row.ipAddress || "—"}</span>;
                case "severity":
                  return (
                    <span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${SEVERITY_BADGE[row.severity] || SEVERITY_BADGE.low}`}>{row.severity || "low"}</span>
                    </span>
                  );
                case "status":
                  return <span className="capitalize text-gray-600 dark:text-gray-300">{row.status || "—"}</span>;
                default:
                  return row[column.key];
              }
            }}
            rowClassName={(row) => `${row.severity === "critical" || row.severity === "high" ? "bg-red-50/60 dark:bg-red-950/20" : "bg-white"} dark:bg-gray-900`}
            emptyState={<span className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No security events for these filters.</span>}
          />
        </CardBody>
      </Card>

      <Card className="shadow-xs bg-white dark:bg-gray-800 mt-6">
        <CardBody className="p-4">
          <h4 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Impersonation history</h4>
          {impersonations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No impersonation recorded in this period.</p>
          ) : (
            <div className="space-y-2">
              {impersonations.map((entry) => (
                <div key={entry._id} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {entry.actorNameSnapshot || entry.actorType || "Admin"} → {entry.summary?.replace(/^.*?(as|vers|to)\s/i, "") || entry.entityType}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${entry.status === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"}`}>{entry.status}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    {entry.ip && <span className="font-mono">{entry.ip}</span>}
                    {entry.reason && <span>Reason: {entry.reason}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mt-4 flex items-center gap-2">
        <CButton
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Previous
        </CButton>
        <CButton
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setPage((p) => p + 1)}
          disabled={rows.length < 50}
        >
          Next
        </CButton>
        <span className="self-center text-xs text-gray-400 ml-2">page {page}</span>
      </div>
    </div>
  );
};

export default SecurityCenter;
