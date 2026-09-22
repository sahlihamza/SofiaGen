import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Select } from "@windmill/react-ui";
import {
  FiPlus,
  FiMoreVertical,
  FiCreditCard,
  FiMonitor,
  FiSmartphone,
  FiCheckCircle,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import PaymentMethodDrawer from "@/components/settings/payments/PaymentMethodDrawer";
import PaymentMethodServices from "@/services/PaymentMethodServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { PopoverMenu, PopoverMenuTrigger } from "@/components/ui/PopoverMenu";
import { Button } from "@sofia/ui";

const displayName = (name) => {
  if (!name) return "-";
  if (typeof name === "string") return name;
  if (typeof name === "object") {
    return name.en || name.fr || Object.values(name).find(Boolean) || "-";
  }
  return String(name);
};

const typeBadge = (type) => {
  const map = {
    online: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    offline: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };
  return map[type] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

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

const PaymentMethods = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const triggerRefs = useRef({});

  const toggleMenu = (id) => setOpenMenuId((prev) => (prev === id ? null : id));

  const canView = hasPermission("payments", "view");
  const canCreate = hasPermission("payments", "create");
  const canUpdate = hasPermission("payments", "update");
  const canDelete = hasPermission("payments", "delete");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["paymentMethodsCatalog"],
    queryFn: () => PaymentMethodServices.getMethods(),
    enabled: canView,
  });

  const allMethods = data?.data || [];

  const methods = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMethods.filter((m) => {
      const matchesSearch =
        !q ||
        m.code?.toLowerCase().includes(q) ||
        displayName(m.name).toLowerCase().includes(q);
      const matchesType = !typeFilter || m.type === typeFilter;
      const matchesStatus = !statusFilter || m.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [data, search, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = allMethods.length;
    const active = allMethods.filter((m) => m.status === "active").length;
    const online = allMethods.filter((m) => m.type === "online").length;
    const offline = allMethods.filter((m) => m.type === "offline").length;
    return { total, active, online, offline };
  }, [allMethods]);

  const deleteMutation = useMutation({
    mutationFn: (id) => PaymentMethodServices.deleteMethod(id),
    onSuccess: () => {
      successMessage(t("PaymentMethodDeleted") || "Payment method deleted");
      queryClient.invalidateQueries(["paymentMethodsCatalog"]);
    },
    onError: (err) =>
      errorMessage(err?.response?.data?.message || err?.message || "Delete failed"),
  });

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (method) => {
    setEditing(method);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleDelete = (method) => {
    if (window.confirm(`${t("ConfirmDeletePaymentMethod") || "Delete"} ${displayName(method.name)}?`)) {
      deleteMutation.mutate(method._id);
    }
  };

  const handleReset = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
  };

  const columns = [
    { key: "code", header: t("Code") || "Code" },
    { key: "name", header: t("Name") || "Name" },
    { key: "type", header: t("Type") || "Type" },
    { key: "status", header: t("Status") || "Status" },
    { key: "displayOrder", header: t("Order") || "Order" },
    { key: "actions", header: "" },
  ];

  const renderCell = ({ row, column }) => {
    switch (column.key) {
      case "code":
        return (
          <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
            {row.code}
          </span>
        );
      case "name":
        return (
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {displayName(row.name)}
          </span>
        );
      case "type":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
            <Badge className={typeBadge(row.type)}>{row.type}</Badge>
          </span>
        );
      case "status":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
            <Badge className={statusBadge(row.status)}>
              {row.status === "active" ? (t("Active") || "Active") : (t("Inactive") || "Inactive")}
            </Badge>
          </span>
        );
      case "displayOrder":
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {row.displayOrder ?? 0}
          </span>
        );
      case "actions": {
        const rowId = row._id;
        const items = [
          canUpdate && {
            key: "edit",
            label: t("Edit") || "Edit",
            icon: <FiEdit2 className="h-4 w-4" />,
            onClick: () => openEdit(row),
          },
          canDelete && {
            key: "delete",
            label: t("Delete") || "Delete",
            icon: <FiTrash2 className="h-4 w-4" />,
            danger: true,
            onClick: () => handleDelete(row),
          },
        ].filter(Boolean);
        return (
          <div className="relative inline-flex">
            <PopoverMenuTrigger
              ref={(el) => {
                if (el) triggerRefs.current[rowId] = el;
                else delete triggerRefs.current[rowId];
              }}
              aria-label={t("Actions") || "Actions"}
              onClick={() => toggleMenu(rowId)}
            />
            <PopoverMenu
              triggerRef={{ current: triggerRefs.current[rowId] || null }}
              isOpen={openMenuId === rowId}
              onClose={() => setOpenMenuId(null)}
              align="right"
              items={items}
              ariaLabel={t("Actions") || "Actions"}
              width={180}
            />
          </div>
        );
      }
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
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-gray-700 dark:text-gray-300">
          {t("PaymentMethods") || "Payment Methods"}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            layout="outline"
            size="large"
            aria-label={t("Reset") || "Reset"}
            onClick={handleReset}
          >
            {t("Reset") || "Reset"}
          </Button>
          {canCreate && (
            <Button
              layout="primary"
              size="large"
              onClick={openCreate}
              iconLeft={FiPlus}
            >
              {t("AddPaymentMethod") || "Add Payment Method"}
            </Button>
          )}
        </div>
      </div>

      <AnimatedContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard
            icon={FiCreditCard}
            label={t("TotalMethods") || "Total Methods"}
            value={stats.total}
            color="bg-sky-500"
          />
          <KpiCard
            icon={FiCheckCircle}
            label={t("ActiveMethods") || "Active Methods"}
            value={stats.active}
            color="bg-emerald-500"
          />
          <KpiCard
            icon={FiMonitor}
            label={t("OnlineMethods") || "Online Methods"}
            value={stats.online}
            color="bg-indigo-500"
          />
          <KpiCard
            icon={FiSmartphone}
            label={t("OfflineMethods") || "Offline Methods"}
            value={stats.offline}
            color="bg-amber-500"
          />
        </div>

        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 mb-4">
              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Search") || "Search"}
                </label>
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("SearchPaymentMethods") || "Search methods..."}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Type") || "Type"}
                </label>
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">{t("AllTypes") || "All types"}</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </Select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t("Status") || "Status"}
                </label>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">{t("AllStatuses") || "All statuses"}</option>
                  <option value="active">{t("Active") || "Active"}</option>
                  <option value="inactive">{t("Inactive") || "Inactive"}</option>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <TableLoading row={8} col={6} width={130} height={20} />
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-red-500">
                {error?.response?.data?.message || error?.message || String(error)}
              </p>
            ) : methods.length > 0 ? (
              <DataTable
                columns={columns}
                rows={methods}
                getRowKey={(row) => row._id}
                tableClassName="min-w-full"
                cellClassName="px-4 py-3"
                renderCell={renderCell}
              />
            ) : (
              <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {search || typeFilter || statusFilter
                  ? t("NoResultsFound") || "No results match your filters."
                  : t("NoPaymentMethods") || "No payment methods found."}
              </div>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>

      <PaymentMethodDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        editing={editing}
      />
    </>
  );
};

export default PaymentMethods;
