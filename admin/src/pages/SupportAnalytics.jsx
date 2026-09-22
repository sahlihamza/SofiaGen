import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Input, Label, Select, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";
import "chart.js/auto";
import { Line } from "react-chartjs-2";
import { FiArrowDown, FiArrowUp, FiInbox, FiClock, FiCheckCircle, FiAlertTriangle, FiSmile } from "react-icons/fi";

//internal import
import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import StatCard from "@/components/dashboard/CStatCard";
import SupportTicketServices from "@/services/SupportTicketServices";
import StoreServices from "@/services/StoreServices";
import useGetCData from "@/hooks/useGetCData";
import { AdminContext } from "@/context/AdminContext";
import { isSuperAdmin as resolveIsSuperAdmin } from "@/utils/permissions";
import {
  STATUS_STYLES,
  STATUS_LABEL_KEY,
  formatDurationMs,
} from "@/components/supportTicket/supportTicketConstants";

const PERIOD_OPTIONS = [
  { value: "today", labelKey: "AnalyticsPeriodToday" },
  { value: "yesterday", labelKey: "AnalyticsPeriodYesterday" },
  { value: "last7days", labelKey: "AnalyticsPeriodLast7Days" },
  { value: "last30days", labelKey: "AnalyticsPeriodLast30Days" },
  { value: "thisMonth", labelKey: "AnalyticsPeriodThisMonth" },
  { value: "thisYear", labelKey: "AnalyticsPeriodThisYear" },
  { value: "custom", labelKey: "AnalyticsPeriodCustom" },
];

const STATUS_ORDER = ["open", "in_progress", "waiting_customer", "resolved", "closed"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// The support analytics backend (supportAnalyticsService.js) only understands
// startDate/endDate  unlike the sales AnalyticsServices endpoints, it has no
// named-period shorthand of its own  so the same PERIOD_OPTIONS shown to the
// user for visual consistency with Sales Analytics are translated into an
// explicit date range client-side before every request.
const periodToRange = (period, customStart, customEnd) => {
  const end = todayISO();
  switch (period) {
    case "today":
      return { startDate: end, endDate: end };
    case "yesterday": {
      const y = isoDaysAgo(1);
      return { startDate: y, endDate: y };
    }
    case "last7days":
      return { startDate: isoDaysAgo(6), endDate: end };
    case "last30days":
      return { startDate: isoDaysAgo(29), endDate: end };
    case "thisMonth": {
      const d = new Date();
      return { startDate: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10), endDate: end };
    }
    case "thisYear": {
      const d = new Date();
      return { startDate: new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10), endDate: end };
    }
    case "custom":
      return { startDate: customStart, endDate: customEnd };
    default:
      return { startDate: isoDaysAgo(29), endDate: end };
  }
};

// null delta means the previous period was 0 and the current one isn't (or
// the metric doesn't support comparison at all, e.g. overdueCount)  shown as
// "New"/no badge rather than a manufactured percentage. Mirrors Analytics.jsx.
const buildTrend = (delta, invert) => {
  if (delta === null || delta === undefined) return "neutral";
  if (delta > 0) return invert ? "negative" : "positive";
  if (delta < 0) return invert ? "positive" : "negative";
  return "neutral";
};

const formatChange = (delta, t) => {
  if (delta === null || delta === undefined) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}%`;
};

const SupportAnalytics = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { state } = useContext(AdminContext);
  const canView = hasPermission("support analytics", "view");
  const isSuperAdmin = resolveIsSuperAdmin(state?.adminInfo);

  const [period, setPeriod] = useState("last30days");
  const [customStart, setCustomStart] = useState(isoDaysAgo(29));
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [storeId, setStoreId] = useState("");
  const [stores, setStores] = useState([]);

  const [summary, setSummary] = useState(null);
  const [csat, setCsat] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Super admins can inspect a single store or leave the selector on "all
  // stores" (empty storeId  see supportAnalyticsController's
  // resolveAnalyticsStoreId). Store-level users never see this selector at
  // all; their storeId is always resolved server-side.
  useEffect(() => {
    if (!isSuperAdmin) return;
    StoreServices.getAllStores()
      .then((res) => setStores(Array.isArray(res) ? res : res?.data || []))
      .catch(() => setStores([]));
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!canView) return undefined;
    if (period === "custom" && (!customStart || !customEnd)) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");

    const { startDate, endDate } = periodToRange(period, customStart, customEnd);
    const params = { startDate, endDate };
    if (isSuperAdmin && storeId) params.storeId = storeId;

    Promise.all([
      SupportTicketServices.getSupportSummary({ ...params, comparePeriod: true }),
      SupportTicketServices.getSupportCsat(params),
      SupportTicketServices.getAgentPerformance(params),
    ])
      .then(([summaryRes, csatRes, agentsRes]) => {
        if (cancelled) return;
        setSummary(summaryRes?.data || null);
        setCsat(csatRes?.data || null);
        setAgents(agentsRes?.data?.agents || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || t("AnalyticsFetchError"));
        setSummary(null);
        setCsat(null);
        setAgents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canView, period, customStart, customEnd, storeId, isSuperAdmin, t]);

  if (!canView) {
    return (
      <>
        <PageTitle>{t("SupportAnalyticsTitle")}</PageTitle>
        <Card>
          <CardBody>
            <p className="text-red-500">{t("AnalyticsPermissionDenied")}</p>
          </CardBody>
        </Card>
      </>
    );
  }

  const byStatus = summary?.byStatus || {};

  const evolution = csat?.evolution || [];
  const csatChartData = {
    labels: evolution.map((row) => new Date(row.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })),
    datasets: [
      {
        label: t("SupportAnalyticsCsatScore"),
        data: evolution.map((row) => row.csatScore),
        borderColor: "#10B981",
        backgroundColor: "#10B981",
        tension: 0.3,
        spanGaps: true,
      },
    ],
  };
  const csatChartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  return (
    <>
      <PageTitle>{t("SupportAnalyticsTitle")}</PageTitle>

      <AnimatedContent>
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full sm:w-64">
                <Label>{t("AnalyticsPeriod")}</Label>
                <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </Select>
              </div>

              {period === "custom" && (
                <>
                  <div>
                    <Label>{t("AnalyticsStartDate")}</Label>
                    <Input
                      type="date"
                      value={customStart}
                      max={customEnd}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>{t("AnalyticsEndDate")}</Label>
                    <Input
                      type="date"
                      value={customEnd}
                      min={customStart}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </div>
                </>
              )}

              {isSuperAdmin && (
                <div className="w-full sm:w-64">
                  <Label>{t("SupportAnalyticsStore")}</Label>
                  <Select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                    <option value="">{t("SupportAnalyticsAllStores")}</option>
                    {stores.map((store) => (
                      <option key={store._id} value={store._id}>
                        {store.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {error && (
          <Card className="mb-6 border border-red-200 dark:border-red-800">
            <CardBody>
              <p className="text-red-500">{error}</p>
            </CardBody>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title={t("SupportAnalyticsTotalTickets")}
            value={(summary?.totalTickets?.value ?? 0).toLocaleString()}
            icon={<FiInbox className="h-5 w-5" />}
            loading={loading}
            change={
              formatChange(summary?.totalTickets?.delta, t) && (
                <span className="inline-flex items-center gap-1">
                  {buildTrend(summary?.totalTickets?.delta) === "positive" && <FiArrowUp className="h-4 w-4" />}
                  {buildTrend(summary?.totalTickets?.delta) === "negative" && <FiArrowDown className="h-4 w-4" />}
                  {formatChange(summary?.totalTickets?.delta, t)}
                </span>
              )
            }
            changeLabel={t("AnalyticsVsPreviousPeriod")}
            trend={buildTrend(summary?.totalTickets?.delta)}
          />

          <StatCard
            title={t("SupportAnalyticsAvgFirstResponse")}
            value={formatDurationMs(summary?.avgFirstResponseTimeMs?.value)}
            icon={<FiClock className="h-5 w-5" />}
            loading={loading}
            change={
              formatChange(summary?.avgFirstResponseTimeMs?.delta, t) && (
                <span className="inline-flex items-center gap-1">
                  {buildTrend(summary?.avgFirstResponseTimeMs?.delta, true) === "positive" && <FiArrowUp className="h-4 w-4" />}
                  {buildTrend(summary?.avgFirstResponseTimeMs?.delta, true) === "negative" && <FiArrowDown className="h-4 w-4" />}
                  {formatChange(summary?.avgFirstResponseTimeMs?.delta, t)}
                </span>
              )
            }
            changeLabel={t("AnalyticsVsPreviousPeriod")}
            trend={buildTrend(summary?.avgFirstResponseTimeMs?.delta, true)}
          />

          <StatCard
            title={t("SupportAnalyticsMttr")}
            value={formatDurationMs(summary?.avgResolutionTimeMs?.value)}
            icon={<FiCheckCircle className="h-5 w-5" />}
            loading={loading}
            change={
              formatChange(summary?.avgResolutionTimeMs?.delta, t) && (
                <span className="inline-flex items-center gap-1">
                  {buildTrend(summary?.avgResolutionTimeMs?.delta, true) === "positive" && <FiArrowUp className="h-4 w-4" />}
                  {buildTrend(summary?.avgResolutionTimeMs?.delta, true) === "negative" && <FiArrowDown className="h-4 w-4" />}
                  {formatChange(summary?.avgResolutionTimeMs?.delta, t)}
                </span>
              )
            }
            changeLabel={t("AnalyticsVsPreviousPeriod")}
            trend={buildTrend(summary?.avgResolutionTimeMs?.delta, true)}
          />

          <StatCard
            title={t("SupportAnalyticsSlaCompliance")}
            value={summary?.slaComplianceRate?.value != null ? `${summary.slaComplianceRate.value}%` : ""}
            icon={<FiSmile className="h-5 w-5" />}
            loading={loading}
            change={
              formatChange(summary?.slaComplianceRate?.delta, t) && (
                <span className="inline-flex items-center gap-1">
                  {buildTrend(summary?.slaComplianceRate?.delta) === "positive" && <FiArrowUp className="h-4 w-4" />}
                  {buildTrend(summary?.slaComplianceRate?.delta) === "negative" && <FiArrowDown className="h-4 w-4" />}
                  {formatChange(summary?.slaComplianceRate?.delta, t)}
                </span>
              )
            }
            changeLabel={t("AnalyticsVsPreviousPeriod")}
            trend={buildTrend(summary?.slaComplianceRate?.delta)}
          />

          {/* Overdue is a point-in-time snapshot ("right now"), not something
              that happened "during" the selected period, so the backend never
              returns a delta for it (see supportAnalyticsService._overdueNow)
               no comparison badge is shown here, by design. */}
          <StatCard
            title={t("SupportAnalyticsOverdueNow")}
            value={(summary?.overdueCount?.value ?? 0).toLocaleString()}
            icon={<FiAlertTriangle className="h-5 w-5" />}
            loading={loading}
            valueClassName={summary?.overdueCount?.value > 0 ? "text-red-600 dark:text-red-400" : undefined}
          />
        </div>

        <Card className="mt-6">
          <CardBody>
            <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4">
              {t("SupportAnalyticsByStatus")}
            </h3>
            {loading ? (
              <div className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
            ) : (
              <div className="flex flex-wrap gap-3">
                {STATUS_ORDER.map((status) => (
                  <span
                    key={status}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_STYLES[status]}`}
                  >
                    {t(STATUS_LABEL_KEY[status])} : {byStatus[status] ?? 0}
                  </span>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="mt-6">
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-300">{t("SupportAnalyticsCsatSection")}</h3>
              <div className="text-right">
                <p className="text-xs text-gray-500">{t("SupportAnalyticsCsatScore")}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {csat?.csatScore != null ? `${csat.csatScore}%` : ""}
                </p>
                <p className="text-xs text-gray-400">
                  {t("SupportAnalyticsCsatRatingsCount", { count: csat?.totalRatings || 0 })}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="h-56 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
            ) : evolution.length === 0 ? (
              <p className="text-gray-500">{t("SupportAnalyticsNoCsatData")}</p>
            ) : (
              <Line data={csatChartData} options={csatChartOptions} />
            )}
          </CardBody>
        </Card>

        <Card className="mt-6">
          <CardBody>
            <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4">
              {t("SupportAnalyticsAgentPerformance")}
            </h3>

            {loading ? (
              <div className="h-40 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
            ) : agents.length === 0 ? (
              <p className="text-gray-500">{t("SupportAnalyticsNoAgentData")}</p>
            ) : (
              <TableContainer className="rounded-lg">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>{t("SupportAnalyticsAgentCol")}</TableCell>
                      <TableCell>{t("SupportAnalyticsResolvedCol")}</TableCell>
                      <TableCell>{t("SupportAnalyticsAvgResolutionCol")}</TableCell>
                      <TableCell>{t("SupportAnalyticsCsatCol")}</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.agentId}>
                        <TableCell>{agent.agentName}</TableCell>
                        <TableCell>{agent.resolvedCount}</TableCell>
                        <TableCell>{formatDurationMs(agent.avgResolutionTimeMs)}</TableCell>
                        <TableCell>
                          {agent.csatScore != null
                            ? `${agent.csatScore}% (${agent.totalRatings})`
                            : t("SupportAnalyticsNoRatings")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>
    </>
  );
};

export default SupportAnalytics;
