import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input } from "@windmill/react-ui";
import { AppDrawer } from "@/components/ui";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import PlanServices from "@/services/PlanServices";
import { Button } from "@sofia/ui";

const UsageQuotas = () => {
  const { t } = useTranslation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["usage-quotas"],
    queryFn: () => PlanServices.getUsageQuotas(),
  });

  const usageData = data?.data || [];
  const summary = data?.summary || {};
  const [searchText, setSearchText] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [expandedStore, setExpandedStore] = useState(null);

  const planOptions = Array.from(new Set(usageData.map((item) => item.planName || "No Plan"))).sort();

  const filteredUsageData = usageData.filter((item) => {
    const query = searchText.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.storeName?.toLowerCase().includes(query) ||
      item.planName?.toLowerCase().includes(query);
    const matchesPlan = !planFilter || item.planName === planFilter;
    return matchesSearch && matchesPlan;
  });

  const totalTrackedQuotas = usageData.reduce(
    (count, item) => count + (item.quotaDetails?.length || 0),
    0
  );
  const totalUnlimitedQuotas = usageData.reduce(
    (count, item) =>
      count +
      (item.quotaDetails?.filter((quota) => quota.limit === null || quota.limit === undefined).length || 0),
    0
  );

  const toggleExpand = (storeId) => {
    setExpandedStore((prev) => (prev === storeId ? null : storeId));
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
      key: "planSlug",
      header: t("PlanSlug") || "Slug",
    },
    {
      key: "quotaSummary",
      header: t("QuotaUsage") || "Quota Usage",
    },
    {
      key: "hasExceeding",
      header: t("Status") || "Status",
    },
    {
      key: "actions",
      header: "",
    },
  ];

  const getBarColor = (percent, isExceeding) => {
    if (isExceeding || percent >= 100) return "bg-red-500";
    if (percent >= 75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const renderQuotaBar = (quota) => {
    const percent = quota.percentage ?? 0;
    const barColor = getBarColor(percent, quota.isExceeding);

    return (
      <div key={quota.key} className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-gray-700 dark:text-gray-300">{quota.key}</span>
          <span className="text-gray-500">
            {quota.used || 0} / {quota.limit ?? "âˆž"}
            {percent !== null && ` (${percent}%)`}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-2 rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        {quota.isExceeding && (
          <p className="mt-1 text-xs text-red-500">
            {t("ExceededBy") || "Exceeded by"} {quota.used - quota.limit}
          </p>
        )}
      </div>
    );
  };

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

      case "planSlug":
        return <Badge variant="primary">{row.planSlug}</Badge>;

      case "quotaSummary":
        return (
          <div className="flex flex-col gap-1">
            {row.quotaDetails?.slice(0, 3).map((quota) => (
              <div key={quota.key} className="flex items-center gap-2 text-xs">
                <span className="w-24 text-gray-600 dark:text-gray-400 truncate">{quota.key}</span>
                <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-1.5 rounded-full ${getBarColor(quota.percentage ?? 0, quota.isExceeding)}`}
                    style={{ width: `${Math.min(100, quota.percentage ?? 0)}%` }}
                  />
                </div>
                <span className="w-20 text-right text-gray-500">
                  {quota.used || 0}/{quota.limit ?? "âˆž"}
                </span>
              </div>
            ))}
            {row.quotaDetails?.length > 3 && (
              <span className="text-xs text-gray-400">
                +{row.quotaDetails.length - 3} {t("MoreQuotas") || "more"}
              </span>
            )}
          </div>
        );

      case "hasExceeding":
        return value ? (
          <Badge variant="danger">{t("Exceeding") || "Exceeding"}</Badge>
        ) : (
          <Badge variant="success">{t("Healthy") || "Healthy"}</Badge>
        );

      case "actions":
        return (
          <Button
            type="button"
            className="px-3 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-700 dark:hover:bg-emerald-900/50"
            onClick={() => toggleExpand(row.storeId)}
          >
            {expandedStore === row.storeId
              ? t("HideDetails") || "Hide"
              : t("ViewDetails") || "View Details"}
          </Button>
        );

      default:
        return value;
    }
  };

  return (
    <>
      <PageTitle>{t("UsageQuotasPageTitle") || "Usage & Quotas"}</PageTitle>

      <AnimatedContent>
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <p className="text-sm text-gray-500">{t("Stores") || "Stores"}</p>
              <p className="mt-2 text-2xl font-semibold">{summary.totalStores || 0}</p>
            </CardBody>
          </Card>
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <p className="text-sm text-gray-500">{t("Plans") || "Plans"}</p>
              <p className="mt-2 text-2xl font-semibold">{summary.totalPlans || 0}</p>
            </CardBody>
          </Card>
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <p className="text-sm text-gray-500">{t("StoresExceeding") || "Stores exceeding"}</p>
              <p className="mt-2 text-2xl font-semibold">{summary.storesExceeding || 0}</p>
            </CardBody>
          </Card>
          <Card className="bg-white dark:bg-gray-800">
            <CardBody>
              <p className="text-sm text-gray-500">{t("TrackedQuotas") || "Tracked quotas"}</p>
              <p className="mt-2 text-2xl font-semibold">{totalTrackedQuotas}</p>
              <p className="text-xs text-gray-500 mt-1">
                {t("UnlimitedQuotas") || "Unlimited quotas"}: {totalUnlimitedQuotas}
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
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t("AllPlans") || "All plans"}</option>
              {planOptions.map((planName) => (
                <option key={planName} value={planName}>
                  {planName}
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              onClick={() => {
                setSearchText("");
                setPlanFilter("");
                setExpandedStore(null);
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
                {t("QuotaUsageByStore") || "Quota Usage by Store"}
              </h3>
              <p className="text-sm text-gray-500">
                {t("QuotaUsageByStoreSubtitle") || "Track quota consumption across your stores."}
              </p>
            </div>

            {isLoading ? (
              <p className="text-sm text-gray-500">{t("Loading") || "Loading..."}</p>
            ) : error ? (
              <p className="text-sm text-red-500">
                {error?.response?.data?.message || error?.message || String(error)}
              </p>
            ) : filteredUsageData.length > 0 ? (
              <DataTable
                columns={columns}
                rows={filteredUsageData}
                getRowKey={(row) => row.storeId}
                tableClassName="min-w-full"
                cellClassName="px-4 py-3 align-top"
                renderCell={renderCell}
                emptyState={
                  <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("NoQuotaUsageData") || "No quota usage data available."}
                  </div>
                }
              />
            ) : (
              <p className="text-sm text-gray-500">{t("NoQuotaUsageData") || "No quota usage data available."}</p>
            )}
          </CardBody>
        </Card>

        <AppDrawer
        isOpen={!!expandedStore}
        onClose={() => setExpandedStore(null)}
        title={t("QuotaDetailsFor") || "Quota Details"}
        width="450px"
      >
        {(() => {
          const store = filteredUsageData.find(
            (item) => item.storeId === expandedStore
          );
          if (!store) return null;
          return (
            <>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {store.storeName}
              </h3>
              <div className="space-y-4">
                {store.quotaDetails?.map((quota) => (
                  <div key={quota.key} className="rounded border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{quota.key}</span>
                      {quota.isExceeding ? (
                        <Badge variant="danger">{t("Exceeding") || "Exceeding"}</Badge>
                      ) : (
                        <Badge variant="success">{t("Healthy") || "Healthy"}</Badge>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>{t("Used") || "Used"}:</span>
                        <span className="font-medium">{quota.used || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("Limit") || "Limit"}:</span>
                        <span className="font-medium">{quota.limit ?? (t("Unlimited") || "Unlimited")}</span>
                      </div>
                      {quota.percentage !== null && (
                        <>
                          <div className="flex justify-between">
                            <span>{t("Usage") || "Usage"}:</span>
                            <span className="font-medium">{quota.percentage}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className={`h-2 rounded-full ${getBarColor(quota.percentage, quota.isExceeding)}`}
                              style={{ width: `${Math.min(100, quota.percentage)}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {store.quotaDetails?.length === 0 && (
                <p className="text-sm text-gray-500">{t("NoQuotaDetails") || "No quota details available."}</p>
              )}
            </>
          );
        })()}
      </AppDrawer>
      </AnimatedContent>
    </>
  );
};

export default UsageQuotas;