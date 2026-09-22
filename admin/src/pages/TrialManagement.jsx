import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Select } from "@windmill/react-ui";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import PlanServices from "@/services/PlanServices";
import { Button } from "@sofia/ui";

const TrialManagement = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["trial-subscriptions"],
    queryFn: () => PlanServices.getTrialSubscriptions(),
  });

  const { mutate: updateTrialConfig, isLoading: isUpdating } = useMutation({
    mutationFn: (config) => PlanServices.updateTrialConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries(["trial-subscriptions"]);
    },
  });

  const trialData = data?.data || [];
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [trialConfig, setTrialConfig] = useState({
    trialDays: 7,
    notifications: { j7: true, j3: true, j1: true },
  });

  const filteredTrialData = trialData.filter((item) => {
    const query = searchText.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.storeName?.toLowerCase().includes(query) ||
      item.planName?.toLowerCase().includes(query);
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConfigChange = (field, value) => {
    setTrialConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNotificationChange = (notif) => {
    setTrialConfig((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [notif]: !prev.notifications[notif],
      },
    }));
  };

  const handleSaveConfig = () => {
    updateTrialConfig(trialConfig);
  };

  const columns = [
    {
      key: "storeName",
      header: t("Store") || "Store",
    },
    {
      key: "planName",
      header: t("Plan") || "Plan",
    },
    {
      key: "trialDays",
      header: t("TrialDays") || "Trial Days",
    },
    {
      key: "trialStartDate",
      header: t("TrialStart") || "Trial Start",
    },
    {
      key: "trialEndDate",
      header: t("TrialEnd") || "Trial End",
    },
    {
      key: "status",
      header: t("Status") || "Status",
    },
    {
      key: "notifications",
      header: t("Notifications") || "Notifications",
    },
  ];

  const renderCell = ({ row, column }) => {
    const value = row[column.key];

    switch (column.key) {
      case "storeName":
        return (
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{row.storeName}</p>
            <p className="text-xs text-gray-500">{t("StoreID") || "ID"}: {row.storeId}</p>
          </div>
        );

      case "planName":
        return (
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{row.planName}</p>
            {row.planId && (
              <p className="text-xs text-gray-400">{t("PlanID") || "ID"}: {row.planId}</p>
            )}
          </div>
        );

      case "trialDays":
        return (
          <Badge variant="info">
            {row.trialDays || 0} {t("Days") || "days"}
          </Badge>
        );

      case "trialStartDate":
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {row.trialStartDate
              ? new Date(row.trialStartDate).toLocaleDateString()
              : "-"}
          </span>
        );

      case "trialEndDate":
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {row.trialEndDate
              ? new Date(row.trialEndDate).toLocaleDateString()
              : "-"}
          </span>
        );

      case "status":
        return (
          <Badge
            type={
              row.status === "trial"
                ? "info"
                : row.status === "active"
                  ? "success"
                  : row.status === "expired"
                    ? "danger"
                    : "gray"
            }
          >
            {row.status}
          </Badge>
        );

      case "notifications":
        return (
          <div className="flex gap-1">
            {row.notifications?.includes("j7") && (
              <Badge variant="warning">J-7</Badge>
            )}
            {row.notifications?.includes("j3") && (
              <Badge variant="warning">J-3</Badge>
            )}
            {row.notifications?.includes("j1") && (
              <Badge variant="danger">J-1</Badge>
            )}
            {!row.notifications?.length && (
              <span className="text-xs text-gray-400">{t("None") || "None"}</span>
            )}
          </div>
        );

      default:
        return value;
    }
  };

  return (
    <>
      <PageTitle>{t("TrialManagementPageTitle") || "Trial Management"}</PageTitle>

      <AnimatedContent>
        <Card className="bg-white dark:bg-gray-800 mb-6">
          <CardBody>
            <h3 className="text-lg font-semibold mb-4">
              {t("TrialConfiguration") || "Trial Configuration"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("TrialDuration") || "Trial Duration"}
                </label>
                <Select
                  value={trialConfig.trialDays}
                  onChange={(e) => handleConfigChange("trialDays", Number(e.target.value))}
                >
                  <option value={7}>7 {t("Days") || "days"}</option>
                  <option value={14}>14 {t("Days") || "days"}</option>
                  <option value={30}>30 {t("Days") || "days"}</option>
                </Select>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("Notifications") || "Notifications"}
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={trialConfig.notifications.j7}
                      onChange={() => handleNotificationChange("j7")}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    J-7 {t("NotifyBeforeTrialEnds") || "Notify 7 days before trial ends"}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={trialConfig.notifications.j3}
                      onChange={() => handleNotificationChange("j3")}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    J-3 {t("NotifyBeforeTrialEnds") || "Notify 3 days before trial ends"}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={trialConfig.notifications.j1}
                      onChange={() => handleNotificationChange("j1")}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    J-1 {t("NotifyBeforeTrialEnds") || "Notify 1 day before trial ends"}
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSaveConfig}
                disabled={isUpdating}
              >
                {isUpdating ? t("Saving") || "Saving..." : t("SaveConfiguration") || "Save Configuration"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <p className="text-sm text-gray-500">{t("TotalTrials") || "Total Trials"}</p>
              <p className="mt-2 text-2xl font-semibold">{trialData.length}</p>
            </CardBody>
          </Card>
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <p className="text-sm text-gray-500">{t("ActiveTrials") || "Active Trials"}</p>
              <p className="mt-2 text-2xl font-semibold">
                {trialData.filter((item) => item.status === "trial").length}
              </p>
            </CardBody>
          </Card>
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <p className="text-sm text-gray-500">{t("CompletedTrials") || "Completed Trials"}</p>
              <p className="mt-2 text-2xl font-semibold">
                {trialData.filter((item) => item.status === "active").length}
              </p>
            </CardBody>
          </Card>
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <p className="text-sm text-gray-500">{t("ExpiredTrials") || "Expired Trials"}</p>
              <p className="mt-2 text-2xl font-semibold">
                {trialData.filter((item) => item.status === "expired").length}
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            type="search"
            placeholder={t("SearchStoresOrPlans") || "Search stores or plans"}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="min-w-[220px]"
          />
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t("AllStatus") || "All status"}</option>
              <option value="trial">{t("Trial") || "Trial"}</option>
              <option value="active">{t("Active") || "Active"}</option>
              <option value="expired">{t("Expired") || "Expired"}</option>
            </Select>
            <Button
              layout="outline"
              onClick={() => {
                setSearchText("");
                setStatusFilter("");
              }}
            >
              {t("Reset") || "Reset"}
            </Button>
          </div>
        </div>

        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                {t("TrialSubscriptions") || "Trial Subscriptions"}
              </h3>
              <p className="text-sm text-gray-500">
                {t("TrialSubscriptionsSubtitle") || "Manage free trial subscriptions and notifications."}
              </p>
            </div>

            {isLoading ? (
              <p className="text-sm text-gray-500">{t("Loading") || "Loading..."}</p>
            ) : error ? (
              <p className="text-sm text-red-500">
                {error?.response?.data?.message || error?.message || String(error)}
              </p>
            ) : filteredTrialData.length > 0 ? (
              <DataTable
                columns={columns}
                rows={filteredTrialData}
                getRowKey={(row) => row.storeId}
                tableClassName="min-w-full"
                cellClassName="px-4 py-3 align-top"
                renderCell={renderCell}
                emptyState={
                  <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("NoTrialData") || "No trial data available."}
                  </div>
                }
              />
            ) : (
              <p className="text-sm text-gray-500">{t("NoTrialData") || "No trial data available."}</p>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>
    </>
  );
};

export default TrialManagement;