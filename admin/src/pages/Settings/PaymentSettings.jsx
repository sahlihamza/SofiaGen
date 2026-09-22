import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Input, Select, Badge, Dropdown, DropdownItem } from "@windmill/react-ui";
import {
  FiToggleLeft,
  FiToggleRight,
  FiEdit,
  FiMoreVertical,
  FiServer,
  FiGlobe,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import PaymentProviderServices from "@/services/PaymentProviderServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import ProviderConfigModal from "@/components/settings/payments/ProviderConfigModal";
import { Button } from "@sofia/ui";

const statusBadge = (enabled, type) => {
  if (enabled) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
  }
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
};

const typeBadge = (type) => {
  const map = {
    gateway: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    manual: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };
  return map[type] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
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

const PaymentSettings = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState({ search: "", type: "", status: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const toggleMenu = (id) => setOpenMenuId((prev) => (prev === id ? null : id));

  const canView = hasPermission("payments", "view");
  const canCreate = hasPermission("payments", "create");
  const canUpdate = hasPermission("payments", "update");
  const canDelete = hasPermission("payments", "delete");
  const canEnable = hasPermission("payments", "enable");
  const canDisable = hasPermission("payments", "disable");
  const canConfigure = hasPermission("payments", "configure");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["platformPaymentProviders", filters, currentPage],
    queryFn: () =>
      PaymentProviderServices.getProviders({
        page: currentPage,
        limit: pageSize,
        ...filters,
      }),
  });

  const providers = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  const stats = useMemo(() => {
    const total = providers.length;
    const enabled = providers.filter((p) => p.enabled !== false).length;
    const disabled = providers.filter((p) => p.enabled === false).length;
    const gateway = providers.filter((p) => p.type === "gateway").length;
    const manual = providers.filter((p) => p.type === "manual").length;
    return { total, enabled, disabled, gateway, manual };
  }, [providers]);

  const enableMutation = useMutation({
    mutationFn: (id) => PaymentProviderServices.enableProvider(id),
    onSuccess: () => {
      successMessage(t("ProviderEnabled") || "Provider enabled");
      queryClient.invalidateQueries(["platformPaymentProviders"]);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Enable failed"),
  });

  const disableMutation = useMutation({
    mutationFn: (id) => PaymentProviderServices.disableProvider(id),
    onSuccess: () => {
      successMessage(t("ProviderDisabled") || "Provider disabled");
      queryClient.invalidateQueries(["platformPaymentProviders"]);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Disable failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => PaymentProviderServices.deleteProvider(id),
    onSuccess: () => {
      successMessage(t("ProviderDeleted") || "Provider deleted");
      queryClient.invalidateQueries(["platformPaymentProviders"]);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Delete failed"),
  });

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({ search: "", type: "", status: "" });
    setCurrentPage(1);
  };

  const openConfig = (provider) => {
    setSelectedProvider(provider);
    setConfigModalOpen(true);
  };

  const closeConfig = () => {
    setConfigModalOpen(false);
    setSelectedProvider(null);
  };

  const columns = [
    { key: "name", header: t("Provider") || "Provider" },
    { key: "code", header: t("Code") || "Code" },
    { key: "type", header: t("Type") || "Type" },
    { key: "status", header: t("Status") || "Status" },
    { key: "countries", header: t("Countries") || "Countries" },
    { key: "currencies", header: t("Currencies") || "Currencies" },
    { key: "subscription", header: t("Subscription") || "Subscription" },
    { key: "environment", header: t("Environment") || "Environment" },
    { key: "actions", header: "" },
  ];

  const renderCell = ({ row, column }) => {
    switch (column.key) {
      case "name":
        return (
          <div className="flex items-center gap-3">
            {row.logo && (
              <img
                src={row.logo}
                alt={row.name}
                className="h-8 w-8 rounded object-contain"
              />
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {row.name}
            </span>
          </div>
        );
      case "code":
        return (
          <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
            {row.code}
          </span>
        );
      case "type":
        return <Badge className={typeBadge(row.type)}>{row.type}</Badge>;
      case "status":
        return (
          <div className="flex items-center gap-2">
            {row.enabled !== false ? (
              <FiToggleRight className="h-5 w-5 text-emerald-500" />
            ) : (
              <FiToggleLeft className="h-5 w-5 text-red-500" />
            )}
            <Badge className={statusBadge(row.enabled, row.type)}>
              {row.enabled !== false ? t("Enabled") || "Enabled" : t("Disabled") || "Disabled"}
            </Badge>
          </div>
        );
      case "countries":
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Array.isArray(row.countries) && row.countries.length > 0
              ? row.countries.slice(0, 2).join(", ") + (row.countries.length > 2 ? "..." : "")
              : "-"}
          </span>
        );
      case "currencies":
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Array.isArray(row.currencies) && row.currencies.length > 0
              ? row.currencies.slice(0, 2).join(", ") + (row.currencies.length > 2 ? "..." : "")
              : "-"}
          </span>
        );
      case "subscription":
        return (
          <Badge
            className={
              row.supportsSubscription
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
            }
          >
            {row.supportsSubscription ? t("Yes") || "Yes" : t("No") || "No"}
          </Badge>
        );
      case "environment":
        return (
          <Badge
            className={
              row.environment === "production"
                ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
            }
          >
            {row.environment || "sandbox"}
          </Badge>
        );
      case "actions":
        return (
          <div className="relative inline-block text-left">
            <Button
              layout="outline"
              size="small"
              aria-label={t("Actions") || "Actions"}
              onClick={() => toggleMenu(row._id)}
              iconLeft={FiMoreVertical}
            />
            <Dropdown
              isOpen={openMenuId === row._id}
              onClose={() => setOpenMenuId(null)}
              align="right"
              className="!bottom-full !mt-0 !mb-2"
            >
              {canConfigure && (
                <DropdownItem onClick={() => { setOpenMenuId(null); openConfig(row); }}>
                  {t("Configure") || "Configure"}
                </DropdownItem>
              )}
              {row.enabled !== false && canDisable && (
                <DropdownItem onClick={() => { setOpenMenuId(null); disableMutation.mutate(row._id); }}>
                  {t("Disable") || "Disable"}
                </DropdownItem>
              )}
              {row.enabled === false && canEnable && (
                <DropdownItem onClick={() => { setOpenMenuId(null); enableMutation.mutate(row._id); }}>
                  {t("Enable") || "Enable"}
                </DropdownItem>
              )}
              {canDelete && (
                <DropdownItem
                  onClick={() => {
                    setOpenMenuId(null);
                    if (window.confirm(t("ConfirmDeleteProvider") || `Delete ${row.name}?`)) {
                      deleteMutation.mutate(row._id);
                    }
                  }}
                >
                  {t("Delete") || "Delete"}
                </DropdownItem>
              )}
            </Dropdown>
          </div>
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
    <div className="mx-auto w-full">
      <PageTitle>{t("PaymentSettings") || "Payment Settings"}</PageTitle>

      <AnimatedContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard
            icon={FiServer}
            label={t("TotalProviders") || "Total Providers"}
            value={stats.total}
            color="bg-sky-500"
          />
          <KpiCard
            icon={FiCheckCircle}
            label={t("EnabledProviders") || "Enabled"}
            value={stats.enabled}
            color="bg-emerald-500"
            subValue={stats.disabled > 0 ? `${stats.disabled} ${t("Disabled") || "disabled"}` : undefined}
          />
          <KpiCard
            icon={FiGlobe}
            label={t("GatewayProviders") || "Gateways"}
            value={stats.gateway}
            color="bg-indigo-500"
          />
          <KpiCard
            icon={FiXCircle}
            label={t("ManualProviders") || "Manual"}
            value={stats.manual}
            color="bg-amber-500"
          />
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          {[t("Providers") || "Providers", t("Configuration") || "Configuration", t("Logs") || "Logs"].map(
            (label, index) => (
              <Button
                key={label}
                type="button"
                onClick={() => setActiveTab(index)}
                className={
                  "rounded-t-lg px-4 py-2.5 text-sm font-medium border-b-2 transition-colors " +
                  (activeTab === index
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-300"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")
                }
              >
                {label}
              </Button>
            )
          )}
        </div>

        {activeTab === 0 && (
          <Card className="bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                {t("PaymentProviders") || "Payment Providers"}
              </h3>
            </div>
            <CardBody>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12 mb-4">
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {t("Search") || "Search"}
                  </label>
                  <Input
                    type="search"
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    placeholder={t("SearchProviders") || "Search providers..."}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {t("Type") || "Type"}
                  </label>
                  <Select
                    value={filters.type}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                  >
                    <option value="">{t("AllTypes") || "All types"}</option>
                    <option value="gateway">Gateway</option>
                    <option value="manual">Manual</option>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {t("Status") || "Status"}
                  </label>
                  <Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                  >
                    <option value="">{t("AllStatuses") || "All statuses"}</option>
                    <option value="true">{t("Enabled") || "Enabled"}</option>
                    <option value="false">{t("Disabled") || "Disabled"}</option>
                  </Select>
                </div>
                <div className="md:col-span-2 flex items-end">
                  <Button layout="outline" onClick={handleReset} className="h-10 w-full">
                    {t("Reset") || "Reset"}
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <TableLoading row={6} col={9} width={130} height={20} />
              ) : error ? (
                <p className="px-4 py-10 text-center text-sm text-red-500">
                  {error?.response?.data?.message || error?.message || String(error)}
                </p>
              ) : providers.length > 0 ? (
                <>
                  <DataTable
                    columns={columns}
                    rows={providers}
                    getRowKey={(row) => row._id}
                    tableClassName="min-w-full"
                    cellClassName="px-4 py-3"
                    renderCell={renderCell}
                  />
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {t("Showing") || "Showing"} {providers.length} {t("Of") || "of"} {pagination.total}
                    </span>
                    {pagination.pages > 1 && (
                      <div className="flex gap-1">
                        <Button
                          layout="outline"
                          size="small"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          {t("Previous") || "Previous"}
                        </Button>
                        <span className="px-3 py-2 text-sm">
                          {currentPage} / {pagination.pages}
                        </span>
                        <Button
                          layout="outline"
                          size="small"
                          disabled={currentPage === pagination.pages}
                          onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                        >
                          {t("Next") || "Next"}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t("NoProvidersFound") || "No providers found."}
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === 1 && (
          <Card className="bg-white dark:bg-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                {t("PaymentConfiguration") || "Payment Configuration"}
              </h3>
            </div>
            <CardBody>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t("ConfigurationDescription") ||
                  "Configure each payment provider by clicking the Configure button in the Providers tab."}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((provider) => (
                  <Card key={provider._id} className="border border-gray-200 dark:border-gray-700">
                    <CardBody>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-gray-100">{provider.name}</h4>
                          <p className="text-xs text-gray-500">{provider.code}</p>
                        </div>
                        <Button
                          layout="outline"
                          size="small"
                          onClick={() => openConfig(provider)}
                          iconLeft={FiEdit}
                        >
                          {t("Configure") || "Configure"}
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {activeTab === 2 && (
          <Card className="bg-white dark:bg-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                {t("PaymentLogs") || "Payment Logs"}
              </h3>
            </div>
            <CardBody>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("LogsDescription") || "Audit logs for payment provider actions are available in the system audit logs."}
              </p>
            </CardBody>
          </Card>
        )}
      </AnimatedContent>

      {selectedProvider && (
        <ProviderConfigModal
          isOpen={configModalOpen}
          onClose={closeConfig}
          provider={selectedProvider}
          onSuccess={() => {
            queryClient.invalidateQueries(["platformPaymentProviders"]);
            closeConfig();
          }}
        />
      )}
    </div>
  );
};

export default PaymentSettings;
