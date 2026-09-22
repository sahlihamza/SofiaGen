import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Select } from "@windmill/react-ui";
import {
  FiEdit,
  FiTrash2,
  FiPlus,
  FiList,
  FiCheckCircle,
  FiXCircle,
  FiCreditCard,
} from "react-icons/fi";
import { useContext } from "react";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import MainDrawer from "@/components/drawer/MainDrawer";
import PaymentRuleDrawer from "@/components/drawer/PaymentRuleDrawer";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import PaymentRuleServices from "@/services/PaymentRuleServices";
import PaymentProviderServices from "@/services/PaymentProviderServices";
import { SidebarContext } from "@/context/SidebarContext";
import { Button } from "@sofia/ui";

const statusBadge = (status) => {
  const map = {
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    inactive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

const KpiCard = ({ icon: Icon, label, value, color, subValue }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
        {subValue && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{subValue}</p>
        )}
      </div>
    </div>
  </div>
);

const PaymentRules = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();
  const { toggleDrawer, setIsUpdate, drawerId, setDrawerId } = useContext(SidebarContext);

  const canView = hasPermission("payments", "view");
  const canCreate = hasPermission("payments", "create");
  const canUpdate = hasPermission("payments", "update");
  const canDelete = hasPermission("payments", "delete");

  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { data: providersData } = useQuery({
    queryKey: ["paymentProvidersForRules"],
    queryFn: () => PaymentProviderServices.getProviders(),
    staleTime: 5 * 60 * 1000,
  });

  const providers = providersData?.data || [];

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["paymentRules", search, providerFilter, statusFilter, currentPage],
    queryFn: () =>
      PaymentRuleServices.getAll({
        search,
        paymentProviderId: providerFilter || undefined,
        status: statusFilter || undefined,
        page: currentPage,
        limit: pageSize,
      }),
    enabled: canView,
    keepPreviousData: true,
  });

  const rules = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.status === "active").length;
    const oneTime = rules.filter((r) => r.supportsOneTime).length;
    const subscription = rules.filter((r) => r.supportsSubscription).length;
    const refund = rules.filter((r) => r.supportsRefund).length;
    return { total, active, oneTime, subscription, refund };
  }, [rules]);

  const deleteMutation = useMutation({
    mutationFn: (id) => PaymentRuleServices.delete(id),
    onSuccess: () => {
      successMessage(t("PaymentRuleDeleted") || "Payment rule deleted");
      queryClient.invalidateQueries(["paymentRules"]);
    },
    onError: (err) =>
      errorMessage(err?.response?.data?.message || err?.message || "Delete failed"),
  });

  const handleDelete = (id) => {
    if (window.confirm(t("ConfirmDeleteRule") || "Are you sure you want to delete this rule?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (id) => {
    setDrawerId(id);
    setIsUpdate(true);
    toggleDrawer();
  };

  const handleCreate = () => {
    setDrawerId(null);
    setIsUpdate(false);
    toggleDrawer();
  };

  const handleReset = () => {
    setSearch("");
    setProviderFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const columns = [
    { key: "priority", header: t("#") || "#" },
    { key: "provider", header: t("Provider") || "Provider" },
    { key: "countries", header: t("Countries") || "Countries" },
    { key: "currencies", header: t("Currencies") || "Currencies" },
    { key: "storeTypes", header: t("StoreTypes") || "Store Types" },
    { key: "clientTypes", header: t("ClientTypes") || "Client Types" },
    { key: "amountRange", header: t("AmountRange") || "Amount Range" },
    { key: "supports", header: t("Supports") || "Supports" },
    { key: "status", header: t("Status") || "Status" },
    { key: "createdAt", header: t("CreatedAt") || "Created At" },
    { key: "actions", header: "" },
  ];

  const renderCell = ({ row, column }) => {
    const providerName = row.paymentProviderId?.name || row.paymentProviderId?.code || "-";

    switch (column.key) {
      case "priority":
        return <span className="text-sm text-gray-500 dark:text-gray-400">{row.priority ?? 0}</span>;
      case "provider":
        return <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{providerName}</span>;
      case "countries":
        return <span className="text-sm text-gray-500 dark:text-gray-400">{Array.isArray(row.countries) && row.countries.length ? row.countries.slice(0, 2).join(", ") + (row.countries.length > 2 ? "..." : "") : "-"}</span>;
      case "currencies":
        return <span className="text-sm text-gray-500 dark:text-gray-400">{Array.isArray(row.currencies) && row.currencies.length ? row.currencies.slice(0, 2).join(", ") + (row.currencies.length > 2 ? "..." : "") : "-"}</span>;
      case "storeTypes":
        return <span className="text-sm text-gray-500 dark:text-gray-400">{Array.isArray(row.storeTypes) && row.storeTypes.length ? row.storeTypes.join(", ") : "All"}</span>;
      case "clientTypes":
        return <span className="text-sm text-gray-500 dark:text-gray-400">{Array.isArray(row.clientTypes) && row.clientTypes.length ? row.clientTypes.join(", ") : "All"}</span>;
      case "amountRange":
        return <span className="text-sm text-gray-500 dark:text-gray-400">{row.minAmount != null || row.maxAmount != null ? `${row.minAmount ?? 0} - ${row.maxAmount ?? "\u221e"}` : "-"}</span>;
      case "supports":
        return <div className="flex flex-wrap gap-1 text-xs">
          {row.supportsOneTime && <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300">{t("OneTime") || "One-time"}</Badge>}
          {row.supportsSubscription && <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300">{t("Subscription") || "Subscription"}</Badge>}
          {row.supportsRefund && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">{t("Refund") || "Refund"}</Badge>}
        </div>;
      case "status":
        return <Badge className={statusBadge(row.status)}>{row.status === "active" ? (t("Active") || "Active") : (t("Inactive") || "Inactive")}</Badge>;
      case "createdAt":
        return <span className="text-sm text-gray-500 dark:text-gray-400">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}</span>;
      case "actions":
        return <div className="flex gap-2">
          {canUpdate && <Button layout="outline" iconLeft={FiEdit} onClick={() => handleEdit(row._id)}>{t("Edit") || "Edit"}</Button>}
          {canDelete && <Button layout="outline" iconLeft={FiTrash2} onClick={() => handleDelete(row._id)} disabled={deleteMutation.isLoading}>{t("Delete") || "Delete"}</Button>}
        </div>;
      default:
        return null;
    }

    return (
      <>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{row.priority ?? 0}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{providerName}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Array.isArray(row.countries) && row.countries.length > 0
              ? row.countries.slice(0, 2).join(", ") + (row.countries.length > 2 ? "..." : "")
              : "-"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Array.isArray(row.currencies) && row.currencies.length > 0
              ? row.currencies.slice(0, 2).join(", ") + (row.currencies.length > 2 ? "..." : "")
              : "-"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Array.isArray(row.storeTypes) && row.storeTypes.length > 0
              ? row.storeTypes.join(", ")
              : "All"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Array.isArray(row.clientTypes) && row.clientTypes.length > 0
              ? row.clientTypes.join(", ")
              : "All"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {row.minAmount != null || row.maxAmount != null
              ? `${row.minAmount ?? 0} - ${row.maxAmount ?? "\u221e"}`
              : "-"}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1 text-xs">
            {row.supportsOneTime && (
              <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300">
                {t("OneTime") || "One-time"}
              </Badge>
            )}
            {row.supportsSubscription && (
              <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300">
                {t("Subscription") || "Subscription"}
              </Badge>
            )}
            {row.supportsRefund && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                {t("Refund") || "Refund"}
              </Badge>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className={statusBadge(row.status)}>
            {row.status === "active" ? (t("Active") || "Active") : (t("Inactive") || "Inactive")}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            {canUpdate && (
              <Button
                layout="outline"
                iconLeft={FiEdit}
                onClick={() => handleEdit(row._id)}
              >
                {t("Edit") || "Edit"}
              </Button>
            )}
            {canDelete && (
              <Button
                layout="outline"
                iconLeft={FiTrash2}
                onClick={() => handleDelete(row._id)}
                disabled={deleteMutation.isLoading}
              >
                {t("Delete") || "Delete"}
              </Button>
            )}
          </div>
        </td>
      </>
    );
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
      <PageTitle>{t("PaymentRulesPageTitle", { defaultValue: "Payment Rules" })}</PageTitle>

      <MainDrawer>
        <PaymentRuleDrawer id={drawerId} />
      </MainDrawer>

      <AnimatedContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard
            icon={FiList}
            label={t("TotalRules") || "Total Rules"}
            value={pagination.total}
            color="bg-sky-500"
          />
          <KpiCard
            icon={FiCheckCircle}
            label={t("ActiveRules") || "Active Rules"}
            value={stats.active}
            color="bg-emerald-500"
            subValue={t("CurrentPage") || "Current page"}
          />
          <KpiCard
            icon={FiCreditCard}
            label={t("OneTimeRules") || "One-time Rules"}
            value={stats.oneTime}
            color="bg-indigo-500"
          />
          <KpiCard
            icon={FiXCircle}
            label={t("SubscriptionRules") || "Subscription Rules"}
            value={stats.subscription}
            color="bg-violet-500"
            subValue={stats.refund > 0 ? `${stats.refund} ${t("RefundRules") || "refund"}` : undefined}
          />
        </div>

        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 mb-4">
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Search") || "Search"}
                </label>
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("SearchPaymentRules") || "Search by provider..."}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Provider") || "Provider"}
                </label>
                <Select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                >
                  <option value="">{t("AllProviders") || "All Providers"}</option>
                  {providers.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name || p.code}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Status") || "Status"}
                </label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">{t("AllStatuses") || "All statuses"}</option>
                  <option value="active">{t("Active") || "Active"}</option>
                  <option value="inactive">{t("Inactive") || "Inactive"}</option>
                </Select>
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <Button layout="outline" onClick={handleReset} className="h-10 flex-1">
                  {t("Reset") || "Reset"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {canCreate && (
                  <Button iconLeft={FiPlus} onClick={handleCreate} className="h-10 rounded-lg">
                    {t("AddRule") || "Add Rule"}
                  </Button>
                )}
              </div>
            </div>

            {isLoading ? (
              <TableLoading row={8} col={11} width={130} height={20} />
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-red-500">
                {error?.response?.data?.message || error?.message || String(error)}
              </p>
            ) : rules.length > 0 ? (
              <DataTable
                columns={columns}
                rows={rules}
                getRowKey={(row) => row._id}
                tableClassName="min-w-full"
                cellClassName="px-4 py-3"
                renderCell={renderCell}
              />
            ) : (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("NoRulesFound") || "No payment rules found."}
              </p>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>
    </>
  );
};

export default PaymentRules;
