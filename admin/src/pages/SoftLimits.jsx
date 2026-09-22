import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input } from "@windmill/react-ui";
import { AppDrawer } from "@/components/ui";
import { FiRefreshCw } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import SoftLimitServices from "@/services/SoftLimitServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { Button } from "@sofia/ui";

const stateBadge = (state) => {
  const map = {
    ok: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    critical: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    blocked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[state] || map.ok;
};

const stateLabel = (state) => {
  const map = {
    ok: "Healthy",
    warning: "Warning",
    critical: "Critical",
    blocked: "Blocked",
  };
  return map[state] || state || "Healthy";
};

const formatUnit = (value, unit) => {
  if (value === null || value === undefined) return "âˆž";

  if (unit === "gb") return `${value} GB`;
  if (unit === "mb") return `${value} MB`;
  if (unit === "days") return `${value} days`;
  return value;
};

const SoftLimits = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);

  const canUpdate = hasPermission("billing", "update") || hasPermission("platform", "update");

  const { data, isLoading, error } = useQuery({
    queryKey: ["soft-limits", searchText, stateFilter],
    queryFn: () =>
      SoftLimitServices.getAll({
        search: searchText,
        state: stateFilter,
        sort: "-updatedAt",
        limit: 200,
      }),
  });

  const summaryQuery = useQuery({
    queryKey: ["soft-limits-summary"],
    queryFn: () => SoftLimitServices.getSummary(),
  });

  const rows = data?.data || [];
  const summary = summaryQuery.data?.data || {};

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.storeName?.toLowerCase().includes(q) ||
        r.quotaTypeCode?.toLowerCase().includes(q) ||
        r.planName?.toLowerCase().includes(q)
    );
  }, [rows, searchText]);

  const handleReset = () => {
    setSearchText("");
    setStateFilter("");
  };

  const handleEvaluateAll = async () => {
    try {
      await SoftLimitServices.evaluateAll();
      successMessage("Soft limits evaluated for all stores");
      queryClient.invalidateQueries({ queryKey: ["soft-limits"] });
      queryClient.invalidateQueries({ queryKey: ["soft-limits-summary"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Evaluation failed");
    }
  };

  const columns = [
    { key: "storeName", header: t("Store") || "Store" },
    { key: "quotaTypeCode", header: t("Quota") || "Quota" },
    { key: "usage", header: t("Usage") || "Usage" },
    { key: "percentage", header: t("UsagePct") || "Usage %" },
    { key: "state", header: t("State") || "State" },
    { key: "thresholds", header: t("Thresholds") || "Soft Limits" },
    { key: "blockedAction", header: t("BlockedAction") || "Blocked Action" },
    { key: "actions", header: "" },
  ];

  const getBarColor = (state) => {
    if (state === "blocked") return "bg-red-500";
    if (state === "critical") return "bg-orange-500";
    if (state === "warning") return "bg-amber-500";
    return "bg-emerald-500";
  };

  const renderCell = ({ row, column }) => {
    const value = row[column.key];

    switch (column.key) {
      case "storeName":
        return (
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{row.storeName}</p>
            <p className="text-xs text-gray-500">{row.planName || "-"}</p>
          </div>
        );

      case "quotaTypeCode":
        return (
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{row.quotaTypeCode}</p>
            <p className="text-xs text-gray-500">{row.quotaTypeName || ""}</p>
          </div>
        );

      case "usage":
        return (
          <span className="text-sm">
            {formatUnit(row.used, row.unit)} / {formatUnit(row.limit, row.unit)}
          </span>
        );

      case "percentage":
        return row.percentage === null ? (
          <span className="text-sm text-gray-400">âˆž</span>

        ) : (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-1.5 rounded-full ${getBarColor(row.state)}`}
                style={{ width: `${Math.min(100, row.percentage)}%` }}
              />
            </div>
            <span className="text-sm">{row.percentage}%</span>
          </div>
        );

      case "state":
        return <Badge className={stateBadge(row.state)}>{stateLabel(row.state)}</Badge>;

      case "thresholds":
        return (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div>W: {row.warningThreshold ?? 80}%</div>
            <div>C: {row.criticalThreshold ?? 95}%</div>
            <div>B: {row.blockedThreshold ?? 100}%</div>
          </div>
        );

      case "blockedAction":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700">
            {row.blockedActionTaken || "none"}
          </span>
        );

      case "actions":
        return (
          <Button
            type="button"
            className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-700"
            onClick={() => setSelectedRow(row)}
          >
            {t("Details") || "Details"}
          </Button>
        );

      default:
        return value;
    }
  };

  return (
    <>
      <PageTitle>{t("SoftLimitsPageTitle") || "Soft Limits"}</PageTitle>

      <AnimatedContent>
        <div className="mb-6 grid gap-4 md:grid-cols-5">
          {[
            { label: t("Total") || "Total", value: summary.total ?? 0, cls: "text-gray-700 dark:text-gray-200" },
            { label: t("Healthy") || "Healthy", value: summary.ok ?? 0, cls: "text-emerald-600" },
            { label: t("Warning") || "Warning", value: summary.warning ?? 0, cls: "text-amber-600" },
            { label: t("Critical") || "Critical", value: summary.critical ?? 0, cls: "text-orange-600" },
            { label: t("Blocked") || "Blocked", value: summary.blocked ?? 0, cls: "text-red-600" },
          ].map((item) => (
            <Card key={item.label} className="bg-white dark:bg-gray-800">
              <CardBody>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${item.cls}`}>{item.value}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            type="search"
            placeholder={t("SearchSoftLimits") || "Search stores or quotas"}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="min-w-[220px]"
          />
          <div className="flex items-center gap-3">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t("AllStates") || "All states"}</option>
              <option value="ok">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="blocked">Blocked</option>
            </select>
            <Button layout="outline" onClick={handleReset} className="px-4 py-2 h-12 text-sm dark:bg-gray-700">
              <span className="text-black dark:text-gray-200">{t("Reset") || "Reset"}</span>
            </Button>
            <Button onClick={handleEvaluateAll} className="h-12 w-full rounded-md whitespace-nowrap">
              <span className="mr-2 flex items-center"><FiRefreshCw /></span>
              {t("EvaluateAll") || "Evaluate All"}
            </Button>
          </div>
        </div>

        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                {t("SoftLimitsList") || "Quota Soft Limits"}
              </h3>
              <p className="text-sm text-gray-500">
                {t("SoftLimitsSubtitle") || "Warning / Critical / Blocked thresholds per store & quota."}
              </p>
            </div>

            {isLoading ? (
              <TableLoading row={10} col={8} width={120} height={20} />
            ) : error ? (
              <p className="text-sm text-red-500">
                {error?.response?.data?.message || error?.message || String(error)}
              </p>
            ) : filtered.length > 0 ? (
              <DataTable
                columns={columns}
                rows={filtered}
                getRowKey={(row) => row._id}
                tableClassName="min-w-full"
                cellClassName="px-4 py-3"
                renderCell={renderCell}
              />
            ) : (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("NoSoftLimits") || "No soft limit data available."}
              </p>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>

      <AppDrawer
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title={t("SoftLimitDetails") || "Soft Limit Details"}
        width="420px"
      >
        {selectedRow && (
          <>
            <div className="space-y-4">
              <div className="rounded border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedRow.quotaTypeCode}
                  </span>
                  <Badge className={stateBadge(selectedRow.state)}>
                    {stateLabel(selectedRow.state)}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>{t("Store") || "Store"}:</span>
                    <span className="font-medium">{selectedRow.storeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("Plan") || "Plan"}:</span>
                    <span className="font-medium">{selectedRow.planName || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("Used") || "Used"}:</span>
                    <span className="font-medium">{formatUnit(selectedRow.used, selectedRow.unit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("Limit") || "Limit"}:</span>
                    <span className="font-medium">{formatUnit(selectedRow.limit, selectedRow.unit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("Usage") || "Usage"}:</span>
                    <span className="font-medium">
                      {selectedRow.percentage === null ? "âˆž" : `${selectedRow.percentage}%`}

                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("WarningThreshold") || "Warning"}:</span>
                    <span className="font-medium">{selectedRow.warningThreshold ?? 80}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("CriticalThreshold") || "Critical"}:</span>
                    <span className="font-medium">{selectedRow.criticalThreshold ?? 95}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("BlockedThreshold") || "Blocked"}:</span>
                    <span className="font-medium">{selectedRow.blockedThreshold ?? 100}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("BlockedAction") || "Blocked Action"}:</span>
                    <span className="font-medium">{selectedRow.blockedActionTaken || "none"}</span>
                  </div>
                  {canUpdate && (
                    <div className="pt-2">
                      <Button
                        size="small"
                        layout="outline"
                        onClick={async () => {
                          try {
                            await SoftLimitServices.evaluate({
                              storeId: selectedRow.storeId,
                              quotaTypeId: selectedRow.quotaTypeId,
                            });
                            successMessage("Re-evaluated");
                            queryClient.invalidateQueries({ queryKey: ["soft-limits"] });
                            queryClient.invalidateQueries({ queryKey: ["soft-limits-summary"] });
                          } catch (err) {
                            errorMessage(err?.response?.data?.message || "Evaluation failed");
                          }
                        }}
                      >
                        {t("Reevaluate") || "Re-evaluate"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </AppDrawer>
    </>
  );
};

export default SoftLimits;
